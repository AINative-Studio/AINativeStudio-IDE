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
import { groupBy } from '../../../../../base/common/collections.js';
import { onUnexpectedError } from '../../../../../base/common/errors.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { clamp } from '../../../../../base/common/numbers.js';
import * as strings from '../../../../../base/common/strings.js';
import { IBulkEditService, ResourceTextEdit } from '../../../../../editor/browser/services/bulkEditService.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { MultiModelEditStackElement, SingleModelEditStackElement } from '../../../../../editor/common/model/editStack.js';
import { IntervalNode, IntervalTree } from '../../../../../editor/common/model/intervalTree.js';
import { ModelDecorationOptions } from '../../../../../editor/common/model/textModel.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IUndoRedoService } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { CellFindMatchModel } from '../contrib/find/findModel.js';
import { CellEditState, isNotebookCellDecoration } from '../notebookBrowser.js';
import { NotebookMetadataChangedEvent } from '../notebookViewEvents.js';
import { NotebookCellSelectionCollection } from './cellSelectionCollection.js';
import { CodeCellViewModel } from './codeCellViewModel.js';
import { MarkupCellViewModel } from './markupCellViewModel.js';
import { CellKind, NotebookCellsChangeType, NotebookFindScopeType, SelectionStateType } from '../../common/notebookCommon.js';
import { INotebookExecutionStateService, NotebookExecutionType } from '../../common/notebookExecutionStateService.js';
import { cellIndexesToRanges, cellRangesToIndexes, reduceCellRanges } from '../../common/notebookRange.js';
const invalidFunc = () => { throw new Error(`Invalid change accessor`); };
class DecorationsTree {
    constructor() {
        this._decorationsTree = new IntervalTree();
    }
    intervalSearch(start, end, filterOwnerId, filterOutValidation, cachedVersionId, onlyMarginDecorations = false) {
        const r1 = this._decorationsTree.intervalSearch(start, end, filterOwnerId, filterOutValidation, cachedVersionId, onlyMarginDecorations);
        return r1;
    }
    search(filterOwnerId, filterOutValidation, overviewRulerOnly, cachedVersionId, onlyMarginDecorations) {
        return this._decorationsTree.search(filterOwnerId, filterOutValidation, cachedVersionId, onlyMarginDecorations);
    }
    collectNodesFromOwner(ownerId) {
        const r1 = this._decorationsTree.collectNodesFromOwner(ownerId);
        return r1;
    }
    collectNodesPostOrder() {
        const r1 = this._decorationsTree.collectNodesPostOrder();
        return r1;
    }
    insert(node) {
        this._decorationsTree.insert(node);
    }
    delete(node) {
        this._decorationsTree.delete(node);
    }
    resolveNode(node, cachedVersionId) {
        this._decorationsTree.resolveNode(node, cachedVersionId);
    }
    acceptReplace(offset, length, textLength, forceMoveMarkers) {
        this._decorationsTree.acceptReplace(offset, length, textLength, forceMoveMarkers);
    }
}
const TRACKED_RANGE_OPTIONS = [
    ModelDecorationOptions.register({ description: 'notebook-view-model-tracked-range-always-grows-when-typing-at-edges', stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */ }),
    ModelDecorationOptions.register({ description: 'notebook-view-model-tracked-range-never-grows-when-typing-at-edges', stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */ }),
    ModelDecorationOptions.register({ description: 'notebook-view-model-tracked-range-grows-only-when-typing-before', stickiness: 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */ }),
    ModelDecorationOptions.register({ description: 'notebook-view-model-tracked-range-grows-only-when-typing-after', stickiness: 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */ }),
];
function _normalizeOptions(options) {
    if (options instanceof ModelDecorationOptions) {
        return options;
    }
    return ModelDecorationOptions.createDynamic(options);
}
let MODEL_ID = 0;
let NotebookViewModel = class NotebookViewModel extends Disposable {
    get options() { return this._options; }
    get onDidChangeOptions() { return this._onDidChangeOptions.event; }
    get viewCells() {
        return this._viewCells;
    }
    get length() {
        return this._viewCells.length;
    }
    get notebookDocument() {
        return this._notebook;
    }
    get uri() {
        return this._notebook.uri;
    }
    get metadata() {
        return this._notebook.metadata;
    }
    get isRepl() {
        return this.viewType === 'repl';
    }
    get onDidChangeViewCells() { return this._onDidChangeViewCells.event; }
    get lastNotebookEditResource() {
        if (this._lastNotebookEditResource.length) {
            return this._lastNotebookEditResource[this._lastNotebookEditResource.length - 1];
        }
        return null;
    }
    get layoutInfo() {
        return this._layoutInfo;
    }
    get onDidChangeSelection() { return this._onDidChangeSelection.event; }
    get selectionHandles() {
        const handlesSet = new Set();
        const handles = [];
        cellRangesToIndexes(this._selectionCollection.selections).map(index => index < this.length ? this.cellAt(index) : undefined).forEach(cell => {
            if (cell && !handlesSet.has(cell.handle)) {
                handles.push(cell.handle);
            }
        });
        return handles;
    }
    set selectionHandles(selectionHandles) {
        const indexes = selectionHandles.map(handle => this._viewCells.findIndex(cell => cell.handle === handle));
        this._selectionCollection.setSelections(cellIndexesToRanges(indexes), true, 'model');
    }
    get focused() {
        return this._focused;
    }
    constructor(viewType, _notebook, _viewContext, _layoutInfo, _options, _instantiationService, _bulkEditService, _undoService, _textModelService, notebookExecutionStateService) {
        super();
        this.viewType = viewType;
        this._notebook = _notebook;
        this._viewContext = _viewContext;
        this._layoutInfo = _layoutInfo;
        this._options = _options;
        this._instantiationService = _instantiationService;
        this._bulkEditService = _bulkEditService;
        this._undoService = _undoService;
        this._textModelService = _textModelService;
        this.notebookExecutionStateService = notebookExecutionStateService;
        this._localStore = this._register(new DisposableStore());
        this._handleToViewCellMapping = new Map();
        this._onDidChangeOptions = this._register(new Emitter());
        this._viewCells = [];
        this._onDidChangeViewCells = this._register(new Emitter());
        this._lastNotebookEditResource = [];
        this._onDidChangeSelection = this._register(new Emitter());
        this._selectionCollection = this._register(new NotebookCellSelectionCollection());
        this._decorationsTree = new DecorationsTree();
        this._decorations = Object.create(null);
        this._lastDecorationId = 0;
        this._foldingRanges = null;
        this._onDidFoldingStateChanged = new Emitter();
        this.onDidFoldingStateChanged = this._onDidFoldingStateChanged.event;
        this._hiddenRanges = [];
        this._focused = true;
        this._decorationIdToCellMap = new Map();
        this._statusBarItemIdToCellMap = new Map();
        this._lastOverviewRulerDecorationId = 0;
        this._overviewRulerDecorations = new Map();
        MODEL_ID++;
        this.id = '$notebookViewModel' + MODEL_ID;
        this._instanceId = strings.singleLetterHash(MODEL_ID);
        const compute = (changes, synchronous) => {
            const diffs = changes.map(splice => {
                return [splice[0], splice[1], splice[2].map(cell => {
                        return createCellViewModel(this._instantiationService, this, cell, this._viewContext);
                    })];
            });
            diffs.reverse().forEach(diff => {
                const deletedCells = this._viewCells.splice(diff[0], diff[1], ...diff[2]);
                this._decorationsTree.acceptReplace(diff[0], diff[1], diff[2].length, true);
                deletedCells.forEach(cell => {
                    this._handleToViewCellMapping.delete(cell.handle);
                    // dispose the cell to release ref to the cell text document
                    cell.dispose();
                });
                diff[2].forEach(cell => {
                    this._handleToViewCellMapping.set(cell.handle, cell);
                    this._localStore.add(cell);
                });
            });
            const selectionHandles = this.selectionHandles;
            this._onDidChangeViewCells.fire({
                synchronous: synchronous,
                splices: diffs
            });
            let endSelectionHandles = [];
            if (selectionHandles.length) {
                const primaryHandle = selectionHandles[0];
                const primarySelectionIndex = this._viewCells.indexOf(this.getCellByHandle(primaryHandle));
                endSelectionHandles = [primaryHandle];
                let delta = 0;
                for (let i = 0; i < diffs.length; i++) {
                    const diff = diffs[0];
                    if (diff[0] + diff[1] <= primarySelectionIndex) {
                        delta += diff[2].length - diff[1];
                        continue;
                    }
                    if (diff[0] > primarySelectionIndex) {
                        endSelectionHandles = [primaryHandle];
                        break;
                    }
                    if (diff[0] + diff[1] > primarySelectionIndex) {
                        endSelectionHandles = [this._viewCells[diff[0] + delta].handle];
                        break;
                    }
                }
            }
            // TODO@rebornix
            const selectionIndexes = endSelectionHandles.map(handle => this._viewCells.findIndex(cell => cell.handle === handle));
            this._selectionCollection.setState(cellIndexesToRanges([selectionIndexes[0]])[0], cellIndexesToRanges(selectionIndexes), true, 'model');
        };
        this._register(this._notebook.onDidChangeContent(e => {
            for (let i = 0; i < e.rawEvents.length; i++) {
                const change = e.rawEvents[i];
                let changes = [];
                const synchronous = e.synchronous ?? true;
                if (change.kind === NotebookCellsChangeType.ModelChange || change.kind === NotebookCellsChangeType.Initialize) {
                    changes = change.changes;
                    compute(changes, synchronous);
                    continue;
                }
                else if (change.kind === NotebookCellsChangeType.Move) {
                    compute([[change.index, change.length, []]], synchronous);
                    compute([[change.newIdx, 0, change.cells]], synchronous);
                }
                else {
                    continue;
                }
            }
        }));
        this._register(this._notebook.onDidChangeContent(contentChanges => {
            contentChanges.rawEvents.forEach(e => {
                if (e.kind === NotebookCellsChangeType.ChangeDocumentMetadata) {
                    this._viewContext.eventDispatcher.emit([new NotebookMetadataChangedEvent(this._notebook.metadata)]);
                }
            });
            if (contentChanges.endSelectionState) {
                this.updateSelectionsState(contentChanges.endSelectionState);
            }
        }));
        this._register(this._viewContext.eventDispatcher.onDidChangeLayout((e) => {
            this._layoutInfo = e.value;
            this._viewCells.forEach(cell => {
                if (cell.cellKind === CellKind.Markup) {
                    if (e.source.width || e.source.fontInfo) {
                        cell.layoutChange({ outerWidth: e.value.width, font: e.value.fontInfo });
                    }
                }
                else {
                    if (e.source.width !== undefined) {
                        cell.layoutChange({ outerWidth: e.value.width, font: e.value.fontInfo });
                    }
                }
            });
        }));
        this._register(this._viewContext.notebookOptions.onDidChangeOptions(e => {
            for (let i = 0; i < this.length; i++) {
                const cell = this._viewCells[i];
                cell.updateOptions(e);
            }
        }));
        this._register(notebookExecutionStateService.onDidChangeExecution(e => {
            if (e.type !== NotebookExecutionType.cell) {
                return;
            }
            const cell = this.getCellByHandle(e.cellHandle);
            if (cell instanceof CodeCellViewModel) {
                cell.updateExecutionState(e);
            }
        }));
        this._register(this._selectionCollection.onDidChangeSelection(e => {
            this._onDidChangeSelection.fire(e);
        }));
        const viewCellCount = this.isRepl ? this._notebook.cells.length - 1 : this._notebook.cells.length;
        for (let i = 0; i < viewCellCount; i++) {
            this._viewCells.push(createCellViewModel(this._instantiationService, this, this._notebook.cells[i], this._viewContext));
        }
        this._viewCells.forEach(cell => {
            this._handleToViewCellMapping.set(cell.handle, cell);
        });
    }
    updateOptions(newOptions) {
        this._options = { ...this._options, ...newOptions };
        this._viewCells.forEach(cell => cell.updateOptions({ readonly: this._options.isReadOnly }));
        this._onDidChangeOptions.fire();
    }
    getFocus() {
        return this._selectionCollection.focus;
    }
    getSelections() {
        return this._selectionCollection.selections;
    }
    getMostRecentlyExecutedCell() {
        const handle = this.notebookExecutionStateService.getLastCompletedCellForNotebook(this._notebook.uri);
        return handle !== undefined ? this.getCellByHandle(handle) : undefined;
    }
    setEditorFocus(focused) {
        this._focused = focused;
    }
    validateRange(cellRange) {
        if (!cellRange) {
            return null;
        }
        const start = clamp(cellRange.start, 0, this.length);
        const end = clamp(cellRange.end, 0, this.length);
        if (start <= end) {
            return { start, end };
        }
        else {
            return { start: end, end: start };
        }
    }
    // selection change from list view's `setFocus` and `setSelection` should always use `source: view` to prevent events breaking the list view focus/selection change transaction
    updateSelectionsState(state, source = 'model') {
        if (this._focused || source === 'model') {
            if (state.kind === SelectionStateType.Handle) {
                const primaryIndex = state.primary !== null ? this.getCellIndexByHandle(state.primary) : null;
                const primarySelection = primaryIndex !== null ? this.validateRange({ start: primaryIndex, end: primaryIndex + 1 }) : null;
                const selections = cellIndexesToRanges(state.selections.map(sel => this.getCellIndexByHandle(sel)))
                    .map(range => this.validateRange(range))
                    .filter(range => range !== null);
                this._selectionCollection.setState(primarySelection, reduceCellRanges(selections), true, source);
            }
            else {
                const primarySelection = this.validateRange(state.focus);
                const selections = state.selections
                    .map(range => this.validateRange(range))
                    .filter(range => range !== null);
                this._selectionCollection.setState(primarySelection, reduceCellRanges(selections), true, source);
            }
        }
    }
    getFoldingStartIndex(index) {
        if (!this._foldingRanges) {
            return -1;
        }
        const range = this._foldingRanges.findRange(index + 1);
        const startIndex = this._foldingRanges.getStartLineNumber(range) - 1;
        return startIndex;
    }
    getFoldingState(index) {
        if (!this._foldingRanges) {
            return 0 /* CellFoldingState.None */;
        }
        const range = this._foldingRanges.findRange(index + 1);
        const startIndex = this._foldingRanges.getStartLineNumber(range) - 1;
        if (startIndex !== index) {
            return 0 /* CellFoldingState.None */;
        }
        return this._foldingRanges.isCollapsed(range) ? 2 /* CellFoldingState.Collapsed */ : 1 /* CellFoldingState.Expanded */;
    }
    getFoldedLength(index) {
        if (!this._foldingRanges) {
            return 0;
        }
        const range = this._foldingRanges.findRange(index + 1);
        const startIndex = this._foldingRanges.getStartLineNumber(range) - 1;
        const endIndex = this._foldingRanges.getEndLineNumber(range) - 1;
        return endIndex - startIndex;
    }
    updateFoldingRanges(ranges) {
        this._foldingRanges = ranges;
        let updateHiddenAreas = false;
        const newHiddenAreas = [];
        let i = 0; // index into hidden
        let k = 0;
        let lastCollapsedStart = Number.MAX_VALUE;
        let lastCollapsedEnd = -1;
        for (; i < ranges.length; i++) {
            if (!ranges.isCollapsed(i)) {
                continue;
            }
            const startLineNumber = ranges.getStartLineNumber(i) + 1; // the first line is not hidden
            const endLineNumber = ranges.getEndLineNumber(i);
            if (lastCollapsedStart <= startLineNumber && endLineNumber <= lastCollapsedEnd) {
                // ignore ranges contained in collapsed regions
                continue;
            }
            if (!updateHiddenAreas && k < this._hiddenRanges.length && this._hiddenRanges[k].start + 1 === startLineNumber && (this._hiddenRanges[k].end + 1) === endLineNumber) {
                // reuse the old ranges
                newHiddenAreas.push(this._hiddenRanges[k]);
                k++;
            }
            else {
                updateHiddenAreas = true;
                newHiddenAreas.push({ start: startLineNumber - 1, end: endLineNumber - 1 });
            }
            lastCollapsedStart = startLineNumber;
            lastCollapsedEnd = endLineNumber;
        }
        if (updateHiddenAreas || k < this._hiddenRanges.length) {
            this._hiddenRanges = newHiddenAreas;
            this._onDidFoldingStateChanged.fire();
        }
        this._viewCells.forEach(cell => {
            if (cell.cellKind === CellKind.Markup) {
                cell.triggerFoldingStateChange();
            }
        });
    }
    getHiddenRanges() {
        return this._hiddenRanges;
    }
    getOverviewRulerDecorations() {
        return Array.from(this._overviewRulerDecorations.values());
    }
    getCellByHandle(handle) {
        return this._handleToViewCellMapping.get(handle);
    }
    getCellIndexByHandle(handle) {
        return this._viewCells.findIndex(cell => cell.handle === handle);
    }
    getCellIndex(cell) {
        return this._viewCells.indexOf(cell);
    }
    cellAt(index) {
        // if (index < 0 || index >= this.length) {
        // 	throw new Error(`Invalid index ${index}`);
        // }
        return this._viewCells[index];
    }
    getCellsInRange(range) {
        if (!range) {
            return this._viewCells.slice(0);
        }
        const validatedRange = this.validateRange(range);
        if (validatedRange) {
            const result = [];
            for (let i = validatedRange.start; i < validatedRange.end; i++) {
                result.push(this._viewCells[i]);
            }
            return result;
        }
        return [];
    }
    /**
     * If this._viewCells[index] is visible then return index
     */
    getNearestVisibleCellIndexUpwards(index) {
        for (let i = this._hiddenRanges.length - 1; i >= 0; i--) {
            const cellRange = this._hiddenRanges[i];
            const foldStart = cellRange.start - 1;
            const foldEnd = cellRange.end;
            if (foldStart > index) {
                continue;
            }
            if (foldStart <= index && foldEnd >= index) {
                return index;
            }
            // foldStart <= index, foldEnd < index
            break;
        }
        return index;
    }
    getNextVisibleCellIndex(index) {
        for (let i = 0; i < this._hiddenRanges.length; i++) {
            const cellRange = this._hiddenRanges[i];
            const foldStart = cellRange.start - 1;
            const foldEnd = cellRange.end;
            if (foldEnd < index) {
                continue;
            }
            // foldEnd >= index
            if (foldStart <= index) {
                return foldEnd + 1;
            }
            break;
        }
        return index + 1;
    }
    getPreviousVisibleCellIndex(index) {
        for (let i = this._hiddenRanges.length - 1; i >= 0; i--) {
            const cellRange = this._hiddenRanges[i];
            const foldStart = cellRange.start - 1;
            const foldEnd = cellRange.end;
            if (foldEnd < index) {
                return index;
            }
            if (foldStart <= index) {
                return foldStart;
            }
        }
        return index;
    }
    hasCell(cell) {
        return this._handleToViewCellMapping.has(cell.handle);
    }
    getVersionId() {
        return this._notebook.versionId;
    }
    getAlternativeId() {
        return this._notebook.alternativeVersionId;
    }
    getTrackedRange(id) {
        return this._getDecorationRange(id);
    }
    _getDecorationRange(decorationId) {
        const node = this._decorations[decorationId];
        if (!node) {
            return null;
        }
        const versionId = this.getVersionId();
        if (node.cachedVersionId !== versionId) {
            this._decorationsTree.resolveNode(node, versionId);
        }
        if (node.range === null) {
            return { start: node.cachedAbsoluteStart - 1, end: node.cachedAbsoluteEnd - 1 };
        }
        return { start: node.range.startLineNumber - 1, end: node.range.endLineNumber - 1 };
    }
    setTrackedRange(id, newRange, newStickiness) {
        const node = (id ? this._decorations[id] : null);
        if (!node) {
            if (!newRange) {
                return null;
            }
            return this._deltaCellDecorationsImpl(0, [], [{ range: new Range(newRange.start + 1, 1, newRange.end + 1, 1), options: TRACKED_RANGE_OPTIONS[newStickiness] }])[0];
        }
        if (!newRange) {
            // node exists, the request is to delete => delete node
            this._decorationsTree.delete(node);
            delete this._decorations[node.id];
            return null;
        }
        this._decorationsTree.delete(node);
        node.reset(this.getVersionId(), newRange.start, newRange.end + 1, new Range(newRange.start + 1, 1, newRange.end + 1, 1));
        node.setOptions(TRACKED_RANGE_OPTIONS[newStickiness]);
        this._decorationsTree.insert(node);
        return node.id;
    }
    _deltaCellDecorationsImpl(ownerId, oldDecorationsIds, newDecorations) {
        const versionId = this.getVersionId();
        const oldDecorationsLen = oldDecorationsIds.length;
        let oldDecorationIndex = 0;
        const newDecorationsLen = newDecorations.length;
        let newDecorationIndex = 0;
        const result = new Array(newDecorationsLen);
        while (oldDecorationIndex < oldDecorationsLen || newDecorationIndex < newDecorationsLen) {
            let node = null;
            if (oldDecorationIndex < oldDecorationsLen) {
                // (1) get ourselves an old node
                do {
                    node = this._decorations[oldDecorationsIds[oldDecorationIndex++]];
                } while (!node && oldDecorationIndex < oldDecorationsLen);
                // (2) remove the node from the tree (if it exists)
                if (node) {
                    this._decorationsTree.delete(node);
                }
            }
            if (newDecorationIndex < newDecorationsLen) {
                // (3) create a new node if necessary
                if (!node) {
                    const internalDecorationId = (++this._lastDecorationId);
                    const decorationId = `${this._instanceId};${internalDecorationId}`;
                    node = new IntervalNode(decorationId, 0, 0);
                    this._decorations[decorationId] = node;
                }
                // (4) initialize node
                const newDecoration = newDecorations[newDecorationIndex];
                const range = newDecoration.range;
                const options = _normalizeOptions(newDecoration.options);
                node.ownerId = ownerId;
                node.reset(versionId, range.startLineNumber, range.endLineNumber, Range.lift(range));
                node.setOptions(options);
                this._decorationsTree.insert(node);
                result[newDecorationIndex] = node.id;
                newDecorationIndex++;
            }
            else {
                if (node) {
                    delete this._decorations[node.id];
                }
            }
        }
        return result;
    }
    deltaCellDecorations(oldDecorations, newDecorations) {
        oldDecorations.forEach(id => {
            const handle = this._decorationIdToCellMap.get(id);
            if (handle !== undefined) {
                const cell = this.getCellByHandle(handle);
                cell?.deltaCellDecorations([id], []);
                this._decorationIdToCellMap.delete(id);
            }
            if (this._overviewRulerDecorations.has(id)) {
                this._overviewRulerDecorations.delete(id);
            }
        });
        const result = [];
        newDecorations.forEach(decoration => {
            if (isNotebookCellDecoration(decoration)) {
                const cell = this.getCellByHandle(decoration.handle);
                const ret = cell?.deltaCellDecorations([], [decoration.options]) || [];
                ret.forEach(id => {
                    this._decorationIdToCellMap.set(id, decoration.handle);
                });
                result.push(...ret);
            }
            else {
                const id = ++this._lastOverviewRulerDecorationId;
                const decorationId = `_overview_${this.id};${id}`;
                this._overviewRulerDecorations.set(decorationId, decoration);
                result.push(decorationId);
            }
        });
        return result;
    }
    deltaCellStatusBarItems(oldItems, newItems) {
        const deletesByHandle = groupBy(oldItems, id => this._statusBarItemIdToCellMap.get(id) ?? -1);
        const result = [];
        newItems.forEach(itemDelta => {
            const cell = this.getCellByHandle(itemDelta.handle);
            const deleted = deletesByHandle[itemDelta.handle] ?? [];
            delete deletesByHandle[itemDelta.handle];
            deleted.forEach(id => this._statusBarItemIdToCellMap.delete(id));
            const ret = cell?.deltaCellStatusBarItems(deleted, itemDelta.items) || [];
            ret.forEach(id => {
                this._statusBarItemIdToCellMap.set(id, itemDelta.handle);
            });
            result.push(...ret);
        });
        for (const _handle in deletesByHandle) {
            const handle = parseInt(_handle);
            const ids = deletesByHandle[handle];
            const cell = this.getCellByHandle(handle);
            cell?.deltaCellStatusBarItems(ids, []);
            ids.forEach(id => this._statusBarItemIdToCellMap.delete(id));
        }
        return result;
    }
    nearestCodeCellIndex(index /* exclusive */) {
        const nearest = this.viewCells.slice(0, index).reverse().findIndex(cell => cell.cellKind === CellKind.Code);
        if (nearest > -1) {
            return index - nearest - 1;
        }
        else {
            const nearestCellTheOtherDirection = this.viewCells.slice(index + 1).findIndex(cell => cell.cellKind === CellKind.Code);
            if (nearestCellTheOtherDirection > -1) {
                return index + 1 + nearestCellTheOtherDirection;
            }
            return -1;
        }
    }
    getEditorViewState() {
        const editingCells = {};
        const collapsedInputCells = {};
        const collapsedOutputCells = {};
        const cellLineNumberStates = {};
        this._viewCells.forEach((cell, i) => {
            if (cell.getEditState() === CellEditState.Editing) {
                editingCells[i] = true;
            }
            if (cell.isInputCollapsed) {
                collapsedInputCells[i] = true;
            }
            if (cell instanceof CodeCellViewModel && cell.isOutputCollapsed) {
                collapsedOutputCells[i] = true;
            }
            if (cell.lineNumbers !== 'inherit') {
                cellLineNumberStates[i] = cell.lineNumbers;
            }
        });
        const editorViewStates = {};
        this._viewCells.map(cell => ({ handle: cell.model.handle, state: cell.saveEditorViewState() })).forEach((viewState, i) => {
            if (viewState.state) {
                editorViewStates[i] = viewState.state;
            }
        });
        return {
            editingCells,
            editorViewStates,
            cellLineNumberStates,
            collapsedInputCells,
            collapsedOutputCells
        };
    }
    restoreEditorViewState(viewState) {
        if (!viewState) {
            return;
        }
        this._viewCells.forEach((cell, index) => {
            const isEditing = viewState.editingCells && viewState.editingCells[index];
            const editorViewState = viewState.editorViewStates && viewState.editorViewStates[index];
            cell.updateEditState(isEditing ? CellEditState.Editing : CellEditState.Preview, 'viewState');
            const cellHeight = viewState.cellTotalHeights ? viewState.cellTotalHeights[index] : undefined;
            cell.restoreEditorViewState(editorViewState, cellHeight);
            if (viewState.collapsedInputCells && viewState.collapsedInputCells[index]) {
                cell.isInputCollapsed = true;
            }
            if (viewState.collapsedOutputCells && viewState.collapsedOutputCells[index] && cell instanceof CodeCellViewModel) {
                cell.isOutputCollapsed = true;
            }
            if (viewState.cellLineNumberStates && viewState.cellLineNumberStates[index]) {
                cell.lineNumbers = viewState.cellLineNumberStates[index];
            }
        });
    }
    /**
     * Editor decorations across cells. For example, find decorations for multiple code cells
     * The reason that we can't completely delegate this to CodeEditorWidget is most of the time, the editors for cells are not created yet but we already have decorations for them.
     */
    changeModelDecorations(callback) {
        const changeAccessor = {
            deltaDecorations: (oldDecorations, newDecorations) => {
                return this._deltaModelDecorationsImpl(oldDecorations, newDecorations);
            }
        };
        let result = null;
        try {
            result = callback(changeAccessor);
        }
        catch (e) {
            onUnexpectedError(e);
        }
        changeAccessor.deltaDecorations = invalidFunc;
        return result;
    }
    _deltaModelDecorationsImpl(oldDecorations, newDecorations) {
        const mapping = new Map();
        oldDecorations.forEach(oldDecoration => {
            const ownerId = oldDecoration.ownerId;
            if (!mapping.has(ownerId)) {
                const cell = this._viewCells.find(cell => cell.handle === ownerId);
                if (cell) {
                    mapping.set(ownerId, { cell: cell, oldDecorations: [], newDecorations: [] });
                }
            }
            const data = mapping.get(ownerId);
            if (data) {
                data.oldDecorations = oldDecoration.decorations;
            }
        });
        newDecorations.forEach(newDecoration => {
            const ownerId = newDecoration.ownerId;
            if (!mapping.has(ownerId)) {
                const cell = this._viewCells.find(cell => cell.handle === ownerId);
                if (cell) {
                    mapping.set(ownerId, { cell: cell, oldDecorations: [], newDecorations: [] });
                }
            }
            const data = mapping.get(ownerId);
            if (data) {
                data.newDecorations = newDecoration.decorations;
            }
        });
        const ret = [];
        mapping.forEach((value, ownerId) => {
            const cellRet = value.cell.deltaModelDecorations(value.oldDecorations, value.newDecorations);
            ret.push({
                ownerId: ownerId,
                decorations: cellRet
            });
        });
        return ret;
    }
    //#region Find
    find(value, options) {
        const matches = [];
        let findCells = [];
        if (options.findScope && (options.findScope.findScopeType === NotebookFindScopeType.Cells || options.findScope.findScopeType === NotebookFindScopeType.Text)) {
            const selectedRanges = options.findScope.selectedCellRanges?.map(range => this.validateRange(range)).filter(range => !!range) ?? [];
            const selectedIndexes = cellRangesToIndexes(selectedRanges);
            findCells = selectedIndexes.map(index => this._viewCells[index]);
        }
        else {
            findCells = this._viewCells;
        }
        findCells.forEach((cell, index) => {
            const cellMatches = cell.startFind(value, options);
            if (cellMatches) {
                matches.push(new CellFindMatchModel(cellMatches.cell, index, cellMatches.contentMatches, []));
            }
        });
        // filter based on options and editing state
        return matches.filter(match => {
            if (match.cell.cellKind === CellKind.Code) {
                // code cell, we only include its match if include input is enabled
                return options.includeCodeInput;
            }
            // markup cell, it depends on the editing state
            if (match.cell.getEditState() === CellEditState.Editing) {
                // editing, even if we includeMarkupPreview
                return options.includeMarkupInput;
            }
            else {
                // cell in preview mode, we should only include it if includeMarkupPreview is false but includeMarkupInput is true
                // if includeMarkupPreview is true, then we should include the webview match result other than this
                return !options.includeMarkupPreview && options.includeMarkupInput;
            }
        });
    }
    replaceOne(cell, range, text) {
        const viewCell = cell;
        this._lastNotebookEditResource.push(viewCell.uri);
        return viewCell.resolveTextModel().then(() => {
            this._bulkEditService.apply([new ResourceTextEdit(cell.uri, { range, text })], { quotableLabel: 'Notebook Replace' });
        });
    }
    async replaceAll(matches, texts) {
        if (!matches.length) {
            return;
        }
        const textEdits = [];
        this._lastNotebookEditResource.push(matches[0].cell.uri);
        matches.forEach(match => {
            match.contentMatches.forEach((singleMatch, index) => {
                textEdits.push({
                    versionId: undefined,
                    textEdit: { range: singleMatch.range, text: texts[index] },
                    resource: match.cell.uri
                });
            });
        });
        return Promise.all(matches.map(match => {
            return match.cell.resolveTextModel();
        })).then(async () => {
            this._bulkEditService.apply({ edits: textEdits }, { quotableLabel: 'Notebook Replace All' });
            return;
        });
    }
    //#endregion
    //#region Undo/Redo
    async _withElement(element, callback) {
        const viewCells = this._viewCells.filter(cell => element.matchesResource(cell.uri));
        const refs = await Promise.all(viewCells.map(cell => this._textModelService.createModelReference(cell.uri)));
        await callback();
        refs.forEach(ref => ref.dispose());
    }
    async undo() {
        const editStack = this._undoService.getElements(this.uri);
        const element = editStack.past.length ? editStack.past[editStack.past.length - 1] : undefined;
        if (element && element instanceof SingleModelEditStackElement || element instanceof MultiModelEditStackElement) {
            await this._withElement(element, async () => {
                await this._undoService.undo(this.uri);
            });
            return (element instanceof SingleModelEditStackElement) ? [element.resource] : element.resources;
        }
        await this._undoService.undo(this.uri);
        return [];
    }
    async redo() {
        const editStack = this._undoService.getElements(this.uri);
        const element = editStack.future[0];
        if (element && element instanceof SingleModelEditStackElement || element instanceof MultiModelEditStackElement) {
            await this._withElement(element, async () => {
                await this._undoService.redo(this.uri);
            });
            return (element instanceof SingleModelEditStackElement) ? [element.resource] : element.resources;
        }
        await this._undoService.redo(this.uri);
        return [];
    }
    //#endregion
    equal(notebook) {
        return this._notebook === notebook;
    }
    dispose() {
        this._localStore.clear();
        this._viewCells.forEach(cell => {
            cell.dispose();
        });
        super.dispose();
    }
};
NotebookViewModel = __decorate([
    __param(5, IInstantiationService),
    __param(6, IBulkEditService),
    __param(7, IUndoRedoService),
    __param(8, ITextModelService),
    __param(9, INotebookExecutionStateService)
], NotebookViewModel);
export { NotebookViewModel };
export function createCellViewModel(instantiationService, notebookViewModel, cell, viewContext) {
    if (cell.cellKind === CellKind.Code) {
        return instantiationService.createInstance(CodeCellViewModel, notebookViewModel.viewType, cell, notebookViewModel.layoutInfo, viewContext);
    }
    else {
        return instantiationService.createInstance(MarkupCellViewModel, notebookViewModel.viewType, cell, notebookViewModel.layoutInfo, notebookViewModel, viewContext);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWaWV3TW9kZWxJbXBsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlld01vZGVsL25vdGVib29rVmlld01vZGVsSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzlELE9BQU8sS0FBSyxPQUFPLE1BQU0sdUNBQXVDLENBQUM7QUFFakUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDL0csT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBSW5FLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzFILE9BQU8sRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDaEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDekYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFN0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDdkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDbEUsT0FBTyxFQUFFLGFBQWEsRUFBcVQsd0JBQXdCLEVBQW9DLE1BQU0sdUJBQXVCLENBQUM7QUFDcmEsT0FBTyxFQUFzQiw0QkFBNEIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzVGLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzNELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBSS9ELE9BQU8sRUFBRSxRQUFRLEVBQWdELHVCQUF1QixFQUErQixxQkFBcUIsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3pNLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3RILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsRUFBYyxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXZILE1BQU0sV0FBVyxHQUFHLEdBQUcsRUFBRSxHQUFHLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUUxRSxNQUFNLGVBQWU7SUFHcEI7UUFDQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQztJQUM1QyxDQUFDO0lBRU0sY0FBYyxDQUFDLEtBQWEsRUFBRSxHQUFXLEVBQUUsYUFBcUIsRUFBRSxtQkFBNEIsRUFBRSxlQUF1QixFQUFFLHdCQUFpQyxLQUFLO1FBQ3JLLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsbUJBQW1CLEVBQUUsZUFBZSxFQUFFLHFCQUFxQixDQUFDLENBQUM7UUFDeEksT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRU0sTUFBTSxDQUFDLGFBQXFCLEVBQUUsbUJBQTRCLEVBQUUsaUJBQTBCLEVBQUUsZUFBdUIsRUFBRSxxQkFBOEI7UUFDckosT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUscUJBQXFCLENBQUMsQ0FBQztJQUVqSCxDQUFDO0lBRU0scUJBQXFCLENBQUMsT0FBZTtRQUMzQyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDaEUsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRU0scUJBQXFCO1FBQzNCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBQ3pELE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztJQUVNLE1BQU0sQ0FBQyxJQUFrQjtRQUMvQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFTSxNQUFNLENBQUMsSUFBa0I7UUFDL0IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRU0sV0FBVyxDQUFDLElBQWtCLEVBQUUsZUFBdUI7UUFDN0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUVNLGFBQWEsQ0FBQyxNQUFjLEVBQUUsTUFBYyxFQUFFLFVBQWtCLEVBQUUsZ0JBQXlCO1FBQ2pHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztJQUNuRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLHFCQUFxQixHQUFHO0lBQzdCLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxFQUFFLFdBQVcsRUFBRSxxRUFBcUUsRUFBRSxVQUFVLDZEQUFxRCxFQUFFLENBQUM7SUFDeEwsc0JBQXNCLENBQUMsUUFBUSxDQUFDLEVBQUUsV0FBVyxFQUFFLG9FQUFvRSxFQUFFLFVBQVUsNERBQW9ELEVBQUUsQ0FBQztJQUN0TCxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxXQUFXLEVBQUUsaUVBQWlFLEVBQUUsVUFBVSwwREFBa0QsRUFBRSxDQUFDO0lBQ2pMLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxFQUFFLFdBQVcsRUFBRSxnRUFBZ0UsRUFBRSxVQUFVLHlEQUFpRCxFQUFFLENBQUM7Q0FDL0ssQ0FBQztBQUVGLFNBQVMsaUJBQWlCLENBQUMsT0FBZ0M7SUFDMUQsSUFBSSxPQUFPLFlBQVksc0JBQXNCLEVBQUUsQ0FBQztRQUMvQyxPQUFPLE9BQU8sQ0FBQztJQUNoQixDQUFDO0lBQ0QsT0FBTyxzQkFBc0IsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDdEQsQ0FBQztBQUVELElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQztBQU1WLElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWtCLFNBQVEsVUFBVTtJQUdoRCxJQUFJLE9BQU8sS0FBK0IsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUVqRSxJQUFJLGtCQUFrQixLQUFrQixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBR2hGLElBQUksU0FBUztRQUNaLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztJQUN4QixDQUFDO0lBRUQsSUFBSSxNQUFNO1FBQ1QsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQztJQUMvQixDQUFDO0lBRUQsSUFBSSxnQkFBZ0I7UUFDbkIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxJQUFJLEdBQUc7UUFDTixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDO0lBQzNCLENBQUM7SUFFRCxJQUFJLFFBQVE7UUFDWCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDO0lBQ2hDLENBQUM7SUFFRCxJQUFZLE1BQU07UUFDakIsT0FBTyxJQUFJLENBQUMsUUFBUSxLQUFLLE1BQU0sQ0FBQztJQUNqQyxDQUFDO0lBR0QsSUFBSSxvQkFBb0IsS0FBMkMsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUk3RyxJQUFJLHdCQUF3QjtRQUMzQixJQUFJLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMzQyxPQUFPLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ2xGLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxJQUFJLFVBQVU7UUFDYixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUM7SUFDekIsQ0FBQztJQUdELElBQUksb0JBQW9CLEtBQW9CLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFJdEYsSUFBWSxnQkFBZ0I7UUFDM0IsTUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUNyQyxNQUFNLE9BQU8sR0FBYSxFQUFFLENBQUM7UUFDN0IsbUJBQW1CLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDM0ksSUFBSSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUMxQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMzQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLE9BQU8sQ0FBQztJQUNoQixDQUFDO0lBRUQsSUFBWSxnQkFBZ0IsQ0FBQyxnQkFBMEI7UUFDdEQsTUFBTSxPQUFPLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDMUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDdEYsQ0FBQztJQWFELElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUN0QixDQUFDO0lBUUQsWUFDUSxRQUFnQixFQUNmLFNBQTRCLEVBQzVCLFlBQXlCLEVBQ3pCLFdBQXNDLEVBQ3RDLFFBQWtDLEVBQ25CLHFCQUE2RCxFQUNsRSxnQkFBbUQsRUFDbkQsWUFBK0MsRUFDOUMsaUJBQXFELEVBQ3hDLDZCQUE4RTtRQUU5RyxLQUFLLEVBQUUsQ0FBQztRQVhELGFBQVEsR0FBUixRQUFRLENBQVE7UUFDZixjQUFTLEdBQVQsU0FBUyxDQUFtQjtRQUM1QixpQkFBWSxHQUFaLFlBQVksQ0FBYTtRQUN6QixnQkFBVyxHQUFYLFdBQVcsQ0FBMkI7UUFDdEMsYUFBUSxHQUFSLFFBQVEsQ0FBMEI7UUFDRiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQ2pELHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFDbEMsaUJBQVksR0FBWixZQUFZLENBQWtCO1FBQzdCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDdkIsa0NBQTZCLEdBQTdCLDZCQUE2QixDQUFnQztRQXBHOUYsZ0JBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQztRQUM3RCw2QkFBd0IsR0FBRyxJQUFJLEdBQUcsRUFBeUIsQ0FBQztRQUVuRCx3QkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUVuRSxlQUFVLEdBQW9CLEVBQUUsQ0FBQztRQTBCeEIsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBaUMsQ0FBQyxDQUFDO1FBRzlGLDhCQUF5QixHQUFVLEVBQUUsQ0FBQztRQWE3QiwwQkFBcUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFVLENBQUMsQ0FBQztRQUd2RSx5QkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksK0JBQStCLEVBQUUsQ0FBQyxDQUFDO1FBbUI3RSxxQkFBZ0IsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ3pDLGlCQUFZLEdBQTZDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0Usc0JBQWlCLEdBQVcsQ0FBQyxDQUFDO1FBRzlCLG1CQUFjLEdBQTBCLElBQUksQ0FBQztRQUM3Qyw4QkFBeUIsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFDO1FBQ3hELDZCQUF3QixHQUFnQixJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFDO1FBQ3JFLGtCQUFhLEdBQWlCLEVBQUUsQ0FBQztRQUNqQyxhQUFRLEdBQVksSUFBSSxDQUFDO1FBTXpCLDJCQUFzQixHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBQ25ELDhCQUF5QixHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBRXRELG1DQUE4QixHQUFXLENBQUMsQ0FBQztRQUMzQyw4QkFBeUIsR0FBRyxJQUFJLEdBQUcsRUFBNEMsQ0FBQztRQWdCdkYsUUFBUSxFQUFFLENBQUM7UUFDWCxJQUFJLENBQUMsRUFBRSxHQUFHLG9CQUFvQixHQUFHLFFBQVEsQ0FBQztRQUMxQyxJQUFJLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUV0RCxNQUFNLE9BQU8sR0FBRyxDQUFDLE9BQTZDLEVBQUUsV0FBb0IsRUFBRSxFQUFFO1lBQ3ZGLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ2xDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7d0JBQ2xELE9BQU8sbUJBQW1CLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLElBQUksRUFBRSxJQUE2QixFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztvQkFDaEgsQ0FBQyxDQUFDLENBQXNDLENBQUM7WUFDMUMsQ0FBQyxDQUFDLENBQUM7WUFFSCxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUM5QixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBRTFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUM1RSxZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUMzQixJQUFJLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDbEQsNERBQTREO29CQUM1RCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2hCLENBQUMsQ0FBQyxDQUFDO2dCQUVILElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ3RCLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDckQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzVCLENBQUMsQ0FBQyxDQUFDO1lBQ0osQ0FBQyxDQUFDLENBQUM7WUFFSCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztZQUUvQyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDO2dCQUMvQixXQUFXLEVBQUUsV0FBVztnQkFDeEIsT0FBTyxFQUFFLEtBQUs7YUFDZCxDQUFDLENBQUM7WUFFSCxJQUFJLG1CQUFtQixHQUFhLEVBQUUsQ0FBQztZQUN2QyxJQUFJLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUM3QixNQUFNLGFBQWEsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDMUMsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBRSxDQUFDLENBQUM7Z0JBQzVGLG1CQUFtQixHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQ3RDLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztnQkFFZCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUN2QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3RCLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxxQkFBcUIsRUFBRSxDQUFDO3dCQUNoRCxLQUFLLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ2xDLFNBQVM7b0JBQ1YsQ0FBQztvQkFFRCxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxxQkFBcUIsRUFBRSxDQUFDO3dCQUNyQyxtQkFBbUIsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO3dCQUN0QyxNQUFNO29CQUNQLENBQUM7b0JBRUQsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLHFCQUFxQixFQUFFLENBQUM7d0JBQy9DLG1CQUFtQixHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7d0JBQ2hFLE1BQU07b0JBQ1AsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUVELGdCQUFnQjtZQUNoQixNQUFNLGdCQUFnQixHQUFHLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ3RILElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsbUJBQW1CLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDekksQ0FBQyxDQUFDO1FBRUYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3BELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUM3QyxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM5QixJQUFJLE9BQU8sR0FBeUMsRUFBRSxDQUFDO2dCQUN2RCxNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQztnQkFFMUMsSUFBSSxNQUFNLENBQUMsSUFBSSxLQUFLLHVCQUF1QixDQUFDLFdBQVcsSUFBSSxNQUFNLENBQUMsSUFBSSxLQUFLLHVCQUF1QixDQUFDLFVBQVUsRUFBRSxDQUFDO29CQUMvRyxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztvQkFDekIsT0FBTyxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztvQkFDOUIsU0FBUztnQkFDVixDQUFDO3FCQUFNLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyx1QkFBdUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDekQsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQztvQkFDMUQsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQztnQkFDMUQsQ0FBQztxQkFBTSxDQUFDO29CQUNQLFNBQVM7Z0JBQ1YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxFQUFFO1lBQ2pFLGNBQWMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNwQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssdUJBQXVCLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztvQkFDL0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDckcsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxjQUFjLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDdEMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQzlELENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3hFLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUUzQixJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDOUIsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDdkMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO3dCQUN6QyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7b0JBQzFFLENBQUM7Z0JBQ0YsQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7d0JBQ2xDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztvQkFDMUUsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN2RSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUN0QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNoQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyw2QkFBNkIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNyRSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUsscUJBQXFCLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQzNDLE9BQU87WUFDUixDQUFDO1lBQ0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7WUFFaEQsSUFBSSxJQUFJLFlBQVksaUJBQWlCLEVBQUUsQ0FBQztnQkFDdkMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDakUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBR0osTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO1FBQ2xHLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxhQUFhLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN4QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQ3pILENBQUM7UUFHRCxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUM5QixJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdEQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsYUFBYSxDQUFDLFVBQTZDO1FBQzFELElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxVQUFVLEVBQUUsQ0FBQztRQUNwRCxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUYsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxDQUFDO0lBQ2pDLENBQUM7SUFFRCxRQUFRO1FBQ1AsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDO0lBQ3hDLENBQUM7SUFFRCxhQUFhO1FBQ1osT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDO0lBQzdDLENBQUM7SUFFRCwyQkFBMkI7UUFDMUIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDLCtCQUErQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdEcsT0FBTyxNQUFNLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7SUFDeEUsQ0FBQztJQUVELGNBQWMsQ0FBQyxPQUFnQjtRQUM5QixJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQztJQUN6QixDQUFDO0lBRUQsYUFBYSxDQUFDLFNBQXdDO1FBQ3JELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JELE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFakQsSUFBSSxLQUFLLElBQUksR0FBRyxFQUFFLENBQUM7WUFDbEIsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQztRQUN2QixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQztRQUNuQyxDQUFDO0lBQ0YsQ0FBQztJQUVELCtLQUErSztJQUMvSyxxQkFBcUIsQ0FBQyxLQUFzQixFQUFFLFNBQTJCLE9BQU87UUFDL0UsSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLE1BQU0sS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUN6QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssa0JBQWtCLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzlDLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQzlGLE1BQU0sZ0JBQWdCLEdBQUcsWUFBWSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFLFlBQVksR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQzNILE1BQU0sVUFBVSxHQUFHLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7cUJBQ2pHLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7cUJBQ3ZDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQWlCLENBQUM7Z0JBQ2xELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ2xHLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUN6RCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsVUFBVTtxQkFDakMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztxQkFDdkMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBaUIsQ0FBQztnQkFDbEQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDbEcsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsb0JBQW9CLENBQUMsS0FBYTtRQUNqQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzFCLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDWCxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3JFLE9BQU8sVUFBVSxDQUFDO0lBQ25CLENBQUM7SUFFRCxlQUFlLENBQUMsS0FBYTtRQUM1QixJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzFCLHFDQUE2QjtRQUM5QixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRXJFLElBQUksVUFBVSxLQUFLLEtBQUssRUFBRSxDQUFDO1lBQzFCLHFDQUE2QjtRQUM5QixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLG9DQUE0QixDQUFDLGtDQUEwQixDQUFDO0lBQ3hHLENBQUM7SUFFRCxlQUFlLENBQUMsS0FBYTtRQUM1QixJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzFCLE9BQU8sQ0FBQyxDQUFDO1FBQ1YsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN2RCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNyRSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUVqRSxPQUFPLFFBQVEsR0FBRyxVQUFVLENBQUM7SUFDOUIsQ0FBQztJQUVELG1CQUFtQixDQUFDLE1BQXNCO1FBQ3pDLElBQUksQ0FBQyxjQUFjLEdBQUcsTUFBTSxDQUFDO1FBQzdCLElBQUksaUJBQWlCLEdBQUcsS0FBSyxDQUFDO1FBQzlCLE1BQU0sY0FBYyxHQUFpQixFQUFFLENBQUM7UUFFeEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsb0JBQW9CO1FBQy9CLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUVWLElBQUksa0JBQWtCLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQztRQUMxQyxJQUFJLGdCQUFnQixHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRTFCLE9BQU8sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUM1QixTQUFTO1lBQ1YsQ0FBQztZQUVELE1BQU0sZUFBZSxHQUFHLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQywrQkFBK0I7WUFDekYsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pELElBQUksa0JBQWtCLElBQUksZUFBZSxJQUFJLGFBQWEsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUNoRiwrQ0FBK0M7Z0JBQy9DLFNBQVM7WUFDVixDQUFDO1lBRUQsSUFBSSxDQUFDLGlCQUFpQixJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLEtBQUssZUFBZSxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEtBQUssYUFBYSxFQUFFLENBQUM7Z0JBQ3JLLHVCQUF1QjtnQkFDdkIsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzNDLENBQUMsRUFBRSxDQUFDO1lBQ0wsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLGlCQUFpQixHQUFHLElBQUksQ0FBQztnQkFDekIsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxlQUFlLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxhQUFhLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUM3RSxDQUFDO1lBQ0Qsa0JBQWtCLEdBQUcsZUFBZSxDQUFDO1lBQ3JDLGdCQUFnQixHQUFHLGFBQWEsQ0FBQztRQUNsQyxDQUFDO1FBRUQsSUFBSSxpQkFBaUIsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN4RCxJQUFJLENBQUMsYUFBYSxHQUFHLGNBQWMsQ0FBQztZQUNwQyxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDdkMsQ0FBQztRQUVELElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzlCLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3ZDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO1lBQ2xDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxlQUFlO1FBQ2QsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDO0lBQzNCLENBQUM7SUFFRCwyQkFBMkI7UUFDMUIsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQzVELENBQUM7SUFFRCxlQUFlLENBQUMsTUFBYztRQUM3QixPQUFPLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVELG9CQUFvQixDQUFDLE1BQWM7UUFDbEMsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVELFlBQVksQ0FBQyxJQUFvQjtRQUNoQyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQXFCLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBRUQsTUFBTSxDQUFDLEtBQWE7UUFDbkIsMkNBQTJDO1FBQzNDLDhDQUE4QztRQUM5QyxJQUFJO1FBRUosT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFFRCxlQUFlLENBQUMsS0FBa0I7UUFDakMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqQyxDQUFDO1FBRUQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVqRCxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3BCLE1BQU0sTUFBTSxHQUFxQixFQUFFLENBQUM7WUFFcEMsS0FBSyxJQUFJLENBQUMsR0FBRyxjQUFjLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxjQUFjLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ2hFLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLENBQUM7WUFFRCxPQUFPLE1BQU0sQ0FBQztRQUNmLENBQUM7UUFFRCxPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRDs7T0FFRztJQUNILGlDQUFpQyxDQUFDLEtBQWE7UUFDOUMsS0FBSyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3pELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEMsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7WUFDdEMsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQztZQUU5QixJQUFJLFNBQVMsR0FBRyxLQUFLLEVBQUUsQ0FBQztnQkFDdkIsU0FBUztZQUNWLENBQUM7WUFFRCxJQUFJLFNBQVMsSUFBSSxLQUFLLElBQUksT0FBTyxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUM1QyxPQUFPLEtBQUssQ0FBQztZQUNkLENBQUM7WUFFRCxzQ0FBc0M7WUFDdEMsTUFBTTtRQUNQLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxLQUFhO1FBQ3BDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3BELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEMsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7WUFDdEMsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQztZQUU5QixJQUFJLE9BQU8sR0FBRyxLQUFLLEVBQUUsQ0FBQztnQkFDckIsU0FBUztZQUNWLENBQUM7WUFFRCxtQkFBbUI7WUFDbkIsSUFBSSxTQUFTLElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQ3hCLE9BQU8sT0FBTyxHQUFHLENBQUMsQ0FBQztZQUNwQixDQUFDO1lBRUQsTUFBTTtRQUNQLENBQUM7UUFFRCxPQUFPLEtBQUssR0FBRyxDQUFDLENBQUM7SUFDbEIsQ0FBQztJQUVELDJCQUEyQixDQUFDLEtBQWE7UUFDeEMsS0FBSyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3pELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEMsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7WUFDdEMsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQztZQUU5QixJQUFJLE9BQU8sR0FBRyxLQUFLLEVBQUUsQ0FBQztnQkFDckIsT0FBTyxLQUFLLENBQUM7WUFDZCxDQUFDO1lBRUQsSUFBSSxTQUFTLElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQ3hCLE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsT0FBTyxDQUFDLElBQW9CO1FBQzNCLE9BQU8sSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVELFlBQVk7UUFDWCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDO0lBQ2pDLENBQUM7SUFFRCxnQkFBZ0I7UUFDZixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUM7SUFDNUMsQ0FBQztJQUVELGVBQWUsQ0FBQyxFQUFVO1FBQ3pCLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxZQUFvQjtRQUMvQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUNELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUN0QyxJQUFJLElBQUksQ0FBQyxlQUFlLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDeEMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDcEQsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUN6QixPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUNqRixDQUFDO1FBRUQsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLENBQUMsRUFBRSxDQUFDO0lBQ3JGLENBQUM7SUFFRCxlQUFlLENBQUMsRUFBaUIsRUFBRSxRQUEyQixFQUFFLGFBQXFDO1FBQ3BHLE1BQU0sSUFBSSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVqRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2YsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1lBRUQsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUscUJBQXFCLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEssQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLHVEQUF1RDtZQUN2RCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ25DLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDbEMsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pILElBQUksQ0FBQyxVQUFVLENBQUMscUJBQXFCLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUN0RCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25DLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQztJQUNoQixDQUFDO0lBRU8seUJBQXlCLENBQUMsT0FBZSxFQUFFLGlCQUEyQixFQUFFLGNBQXVDO1FBQ3RILE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUV0QyxNQUFNLGlCQUFpQixHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQztRQUNuRCxJQUFJLGtCQUFrQixHQUFHLENBQUMsQ0FBQztRQUUzQixNQUFNLGlCQUFpQixHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUM7UUFDaEQsSUFBSSxrQkFBa0IsR0FBRyxDQUFDLENBQUM7UUFFM0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxLQUFLLENBQVMsaUJBQWlCLENBQUMsQ0FBQztRQUNwRCxPQUFPLGtCQUFrQixHQUFHLGlCQUFpQixJQUFJLGtCQUFrQixHQUFHLGlCQUFpQixFQUFFLENBQUM7WUFFekYsSUFBSSxJQUFJLEdBQXdCLElBQUksQ0FBQztZQUVyQyxJQUFJLGtCQUFrQixHQUFHLGlCQUFpQixFQUFFLENBQUM7Z0JBQzVDLGdDQUFnQztnQkFDaEMsR0FBRyxDQUFDO29CQUNILElBQUksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNuRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksa0JBQWtCLEdBQUcsaUJBQWlCLEVBQUU7Z0JBRTFELG1EQUFtRDtnQkFDbkQsSUFBSSxJQUFJLEVBQUUsQ0FBQztvQkFDVixJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNwQyxDQUFDO1lBQ0YsQ0FBQztZQUVELElBQUksa0JBQWtCLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQztnQkFDNUMscUNBQXFDO2dCQUNyQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ1gsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7b0JBQ3hELE1BQU0sWUFBWSxHQUFHLEdBQUcsSUFBSSxDQUFDLFdBQVcsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO29CQUNuRSxJQUFJLEdBQUcsSUFBSSxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDNUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsR0FBRyxJQUFJLENBQUM7Z0JBQ3hDLENBQUM7Z0JBRUQsc0JBQXNCO2dCQUN0QixNQUFNLGFBQWEsR0FBRyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQztnQkFDekQsTUFBTSxLQUFLLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQztnQkFDbEMsTUFBTSxPQUFPLEdBQUcsaUJBQWlCLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUV6RCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztnQkFDdkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDckYsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFFekIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFFbkMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFFckMsa0JBQWtCLEVBQUUsQ0FBQztZQUN0QixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxJQUFJLEVBQUUsQ0FBQztvQkFDVixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNuQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxjQUF3QixFQUFFLGNBQTBDO1FBQ3hGLGNBQWMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDM0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUVuRCxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDMUIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDMUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ3JDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDeEMsQ0FBQztZQUVELElBQUksSUFBSSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUM1QyxJQUFJLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzNDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQztRQUU1QixjQUFjLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ25DLElBQUksd0JBQXdCLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztnQkFDMUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3JELE1BQU0sR0FBRyxHQUFHLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3ZFLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUU7b0JBQ2hCLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDeEQsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQ3JCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyw4QkFBOEIsQ0FBQztnQkFDakQsTUFBTSxZQUFZLEdBQUcsYUFBYSxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDO2dCQUNsRCxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFDN0QsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUMzQixDQUFDO1FBRUYsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxRQUFrQixFQUFFLFFBQTRDO1FBQ3ZGLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFOUYsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFDO1FBQzVCLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDNUIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDcEQsTUFBTSxPQUFPLEdBQUcsZUFBZSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDeEQsT0FBTyxlQUFlLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFakUsTUFBTSxHQUFHLEdBQUcsSUFBSSxFQUFFLHVCQUF1QixDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQ2hCLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMxRCxDQUFDLENBQUMsQ0FBQztZQUVILE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztRQUNyQixDQUFDLENBQUMsQ0FBQztRQUVILEtBQUssTUFBTSxPQUFPLElBQUksZUFBZSxFQUFFLENBQUM7WUFDdkMsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2pDLE1BQU0sR0FBRyxHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNwQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzFDLElBQUksRUFBRSx1QkFBdUIsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDdkMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM5RCxDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRUQsb0JBQW9CLENBQUMsS0FBYSxDQUFDLGVBQWU7UUFDakQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVHLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDbEIsT0FBTyxLQUFLLEdBQUcsT0FBTyxHQUFHLENBQUMsQ0FBQztRQUM1QixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sNEJBQTRCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3hILElBQUksNEJBQTRCLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDdkMsT0FBTyxLQUFLLEdBQUcsQ0FBQyxHQUFHLDRCQUE0QixDQUFDO1lBQ2pELENBQUM7WUFDRCxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ1gsQ0FBQztJQUNGLENBQUM7SUFFRCxrQkFBa0I7UUFDakIsTUFBTSxZQUFZLEdBQStCLEVBQUUsQ0FBQztRQUNwRCxNQUFNLG1CQUFtQixHQUErQixFQUFFLENBQUM7UUFDM0QsTUFBTSxvQkFBb0IsR0FBK0IsRUFBRSxDQUFDO1FBQzVELE1BQU0sb0JBQW9CLEdBQW9DLEVBQUUsQ0FBQztRQUVqRSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNuQyxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsS0FBSyxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ25ELFlBQVksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7WUFDeEIsQ0FBQztZQUVELElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQzNCLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztZQUMvQixDQUFDO1lBRUQsSUFBSSxJQUFJLFlBQVksaUJBQWlCLElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQ2pFLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztZQUNoQyxDQUFDO1lBRUQsSUFBSSxJQUFJLENBQUMsV0FBVyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUNwQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO1lBQzVDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sZ0JBQWdCLEdBQXlELEVBQUUsQ0FBQztRQUNsRixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUN4SCxJQUFJLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDckIsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQztZQUN2QyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPO1lBQ04sWUFBWTtZQUNaLGdCQUFnQjtZQUNoQixvQkFBb0I7WUFDcEIsbUJBQW1CO1lBQ25CLG9CQUFvQjtTQUNwQixDQUFDO0lBQ0gsQ0FBQztJQUVELHNCQUFzQixDQUFDLFNBQStDO1FBQ3JFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQ3ZDLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxZQUFZLElBQUksU0FBUyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUMxRSxNQUFNLGVBQWUsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLElBQUksU0FBUyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRXhGLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQzdGLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7WUFDOUYsSUFBSSxDQUFDLHNCQUFzQixDQUFDLGVBQWUsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUN6RCxJQUFJLFNBQVMsQ0FBQyxtQkFBbUIsSUFBSSxTQUFTLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDM0UsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQztZQUM5QixDQUFDO1lBQ0QsSUFBSSxTQUFTLENBQUMsb0JBQW9CLElBQUksU0FBUyxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksWUFBWSxpQkFBaUIsRUFBRSxDQUFDO2dCQUNsSCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO1lBQy9CLENBQUM7WUFDRCxJQUFJLFNBQVMsQ0FBQyxvQkFBb0IsSUFBSSxTQUFTLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDN0UsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDMUQsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVEOzs7T0FHRztJQUNILHNCQUFzQixDQUFJLFFBQWdFO1FBQ3pGLE1BQU0sY0FBYyxHQUFvQztZQUN2RCxnQkFBZ0IsRUFBRSxDQUFDLGNBQXVDLEVBQUUsY0FBNEMsRUFBMkIsRUFBRTtnQkFDcEksT0FBTyxJQUFJLENBQUMsMEJBQTBCLENBQUMsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ3hFLENBQUM7U0FDRCxDQUFDO1FBRUYsSUFBSSxNQUFNLEdBQWEsSUFBSSxDQUFDO1FBQzVCLElBQUksQ0FBQztZQUNKLE1BQU0sR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbkMsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0QixDQUFDO1FBRUQsY0FBYyxDQUFDLGdCQUFnQixHQUFHLFdBQVcsQ0FBQztRQUU5QyxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFTywwQkFBMEIsQ0FBQyxjQUF1QyxFQUFFLGNBQTRDO1FBRXZILE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxFQUF3SCxDQUFDO1FBQ2hKLGNBQWMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUU7WUFDdEMsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQztZQUV0QyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUMzQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLENBQUM7Z0JBQ25FLElBQUksSUFBSSxFQUFFLENBQUM7b0JBQ1YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxFQUFFLEVBQUUsY0FBYyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzlFLENBQUM7WUFDRixDQUFDO1lBRUQsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUUsQ0FBQztZQUNuQyxJQUFJLElBQUksRUFBRSxDQUFDO2dCQUNWLElBQUksQ0FBQyxjQUFjLEdBQUcsYUFBYSxDQUFDLFdBQVcsQ0FBQztZQUNqRCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxjQUFjLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxFQUFFO1lBQ3RDLE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUM7WUFFdEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDM0IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxDQUFDO2dCQUVuRSxJQUFJLElBQUksRUFBRSxDQUFDO29CQUNWLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsRUFBRSxFQUFFLGNBQWMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM5RSxDQUFDO1lBQ0YsQ0FBQztZQUVELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFFLENBQUM7WUFDbkMsSUFBSSxJQUFJLEVBQUUsQ0FBQztnQkFDVixJQUFJLENBQUMsY0FBYyxHQUFHLGFBQWEsQ0FBQyxXQUFXLENBQUM7WUFDakQsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxHQUFHLEdBQTRCLEVBQUUsQ0FBQztRQUN4QyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO1lBQ2xDLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDN0YsR0FBRyxDQUFDLElBQUksQ0FBQztnQkFDUixPQUFPLEVBQUUsT0FBTztnQkFDaEIsV0FBVyxFQUFFLE9BQU87YUFDcEIsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLEdBQUcsQ0FBQztJQUNaLENBQUM7SUFFRCxjQUFjO0lBQ2QsSUFBSSxDQUFDLEtBQWEsRUFBRSxPQUE2QjtRQUNoRCxNQUFNLE9BQU8sR0FBNkIsRUFBRSxDQUFDO1FBQzdDLElBQUksU0FBUyxHQUFvQixFQUFFLENBQUM7UUFFcEMsSUFBSSxPQUFPLENBQUMsU0FBUyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxhQUFhLEtBQUsscUJBQXFCLENBQUMsS0FBSyxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsYUFBYSxLQUFLLHFCQUFxQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDOUosTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNwSSxNQUFNLGVBQWUsR0FBRyxtQkFBbUIsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUM1RCxTQUFTLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNsRSxDQUFDO2FBQU0sQ0FBQztZQUNQLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQzdCLENBQUM7UUFFRCxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQ2pDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ25ELElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2pCLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxrQkFBa0IsQ0FDbEMsV0FBVyxDQUFDLElBQUksRUFDaEIsS0FBSyxFQUNMLFdBQVcsQ0FBQyxjQUFjLEVBQzFCLEVBQUUsQ0FDRixDQUFDLENBQUM7WUFDSixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCw0Q0FBNEM7UUFFNUMsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQzdCLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUMzQyxtRUFBbUU7Z0JBQ25FLE9BQU8sT0FBTyxDQUFDLGdCQUFnQixDQUFDO1lBQ2pDLENBQUM7WUFFRCwrQ0FBK0M7WUFDL0MsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxLQUFLLGFBQWEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDekQsMkNBQTJDO2dCQUMzQyxPQUFPLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztZQUNuQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1Asa0hBQWtIO2dCQUNsSCxtR0FBbUc7Z0JBQ25HLE9BQU8sQ0FBQyxPQUFPLENBQUMsb0JBQW9CLElBQUksT0FBTyxDQUFDLGtCQUFrQixDQUFDO1lBQ3BFLENBQUM7UUFDRixDQUFDLENBQ0EsQ0FBQztJQUNILENBQUM7SUFFRCxVQUFVLENBQUMsSUFBb0IsRUFBRSxLQUFZLEVBQUUsSUFBWTtRQUMxRCxNQUFNLFFBQVEsR0FBRyxJQUFxQixDQUFDO1FBQ3ZDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2xELE9BQU8sUUFBUSxDQUFDLGdCQUFnQixFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUM1QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUMxQixDQUFDLElBQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQ2pELEVBQUUsYUFBYSxFQUFFLGtCQUFrQixFQUFFLENBQ3JDLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQWlDLEVBQUUsS0FBZTtRQUNsRSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3JCLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxTQUFTLEdBQXlCLEVBQUUsQ0FBQztRQUMzQyxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFekQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUN2QixLQUFLLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFdBQVcsRUFBRSxLQUFLLEVBQUUsRUFBRTtnQkFDbkQsU0FBUyxDQUFDLElBQUksQ0FBQztvQkFDZCxTQUFTLEVBQUUsU0FBUztvQkFDcEIsUUFBUSxFQUFFLEVBQUUsS0FBSyxFQUFHLFdBQXlCLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQ3pFLFFBQVEsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUc7aUJBQ3hCLENBQUMsQ0FBQztZQUNKLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUN0QyxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUN0QyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRTtZQUNuQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsYUFBYSxFQUFFLHNCQUFzQixFQUFFLENBQUMsQ0FBQztZQUM3RixPQUFPO1FBQ1IsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsWUFBWTtJQUVaLG1CQUFtQjtJQUVYLEtBQUssQ0FBQyxZQUFZLENBQUMsT0FBaUUsRUFBRSxRQUE2QjtRQUMxSCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDcEYsTUFBTSxJQUFJLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3RyxNQUFNLFFBQVEsRUFBRSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsS0FBSyxDQUFDLElBQUk7UUFFVCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUQsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUU5RixJQUFJLE9BQU8sSUFBSSxPQUFPLFlBQVksMkJBQTJCLElBQUksT0FBTyxZQUFZLDBCQUEwQixFQUFFLENBQUM7WUFDaEgsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDM0MsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDeEMsQ0FBQyxDQUFDLENBQUM7WUFFSCxPQUFPLENBQUMsT0FBTyxZQUFZLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO1FBQ2xHLENBQUM7UUFFRCxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QyxPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBSTtRQUVULE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMxRCxNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXBDLElBQUksT0FBTyxJQUFJLE9BQU8sWUFBWSwyQkFBMkIsSUFBSSxPQUFPLFlBQVksMEJBQTBCLEVBQUUsQ0FBQztZQUNoSCxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLEtBQUssSUFBSSxFQUFFO2dCQUMzQyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN4QyxDQUFDLENBQUMsQ0FBQztZQUVILE9BQU8sQ0FBQyxPQUFPLFlBQVksMkJBQTJCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7UUFDbEcsQ0FBQztRQUVELE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRXZDLE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztJQUVELFlBQVk7SUFFWixLQUFLLENBQUMsUUFBMkI7UUFDaEMsT0FBTyxJQUFJLENBQUMsU0FBUyxLQUFLLFFBQVEsQ0FBQztJQUNwQyxDQUFDO0lBRVEsT0FBTztRQUNmLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDekIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDOUIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDO1FBRUgsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUM7Q0FDRCxDQUFBO0FBaDlCWSxpQkFBaUI7SUFpRzNCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSw4QkFBOEIsQ0FBQTtHQXJHcEIsaUJBQWlCLENBZzlCN0I7O0FBSUQsTUFBTSxVQUFVLG1CQUFtQixDQUFDLG9CQUEyQyxFQUFFLGlCQUFvQyxFQUFFLElBQTJCLEVBQUUsV0FBd0I7SUFDM0ssSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNyQyxPQUFPLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsRUFBRSxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUM1SSxDQUFDO1NBQU0sQ0FBQztRQUNQLE9BQU8sb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUFFLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLENBQUMsVUFBVSxFQUFFLGlCQUFpQixFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ2pLLENBQUM7QUFDRixDQUFDIn0=