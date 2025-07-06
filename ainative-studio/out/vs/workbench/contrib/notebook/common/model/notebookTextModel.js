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
var NotebookTextModel_1;
import { LcsDiff } from '../../../../../base/common/diff/diff.js';
import { Emitter, PauseableEmitter } from '../../../../../base/common/event.js';
import { hash } from '../../../../../base/common/hash.js';
import { Disposable, dispose } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { filter } from '../../../../../base/common/objects.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { isDefined } from '../../../../../base/common/types.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { TextModel } from '../../../../../editor/common/model/textModel.js';
import { SearchParams } from '../../../../../editor/common/model/textModelSearch.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { IUndoRedoService } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { ILanguageDetectionService } from '../../../../services/languageDetection/common/languageDetectionWorkerService.js';
import { CellKind, CellUri, diff, NotebookCellExecutionState, NotebookCellsChangeType } from '../notebookCommon.js';
import { INotebookExecutionStateService } from '../notebookExecutionStateService.js';
import { CellMetadataEdit, MoveCellEdit, SpliceCellsEdit } from './cellEdit.js';
import { NotebookCellOutputTextModel } from './notebookCellOutputTextModel.js';
import { NotebookCellTextModel } from './notebookCellTextModel.js';
class StackOperation {
    get code() {
        return this._operations.length === 1 ? this._operations[0].code : 'undoredo.notebooks.stackOperation';
    }
    get label() {
        return this._operations.length === 1 ? this._operations[0].label : 'edit';
    }
    constructor(textModel, undoRedoGroup, _pauseableEmitter, _postUndoRedo, selectionState, beginAlternativeVersionId) {
        this.textModel = textModel;
        this.undoRedoGroup = undoRedoGroup;
        this._pauseableEmitter = _pauseableEmitter;
        this._postUndoRedo = _postUndoRedo;
        this.tag = 'notebookUndoRedoElement';
        this._operations = [];
        this._beginSelectionState = undefined;
        this._resultSelectionState = undefined;
        this.type = 1 /* UndoRedoElementType.Workspace */;
        this._beginSelectionState = selectionState;
        this._beginAlternativeVersionId = beginAlternativeVersionId;
        this._resultAlternativeVersionId = beginAlternativeVersionId;
    }
    get resources() {
        return [this.textModel.uri];
    }
    get isEmpty() {
        return this._operations.length === 0;
    }
    pushEndState(alternativeVersionId, selectionState) {
        // https://github.com/microsoft/vscode/issues/207523
        this._resultAlternativeVersionId = alternativeVersionId;
        this._resultSelectionState = selectionState || this._resultSelectionState;
    }
    pushEditOperation(element, beginSelectionState, resultSelectionState, alternativeVersionId) {
        if (this._operations.length === 0) {
            this._beginSelectionState = this._beginSelectionState ?? beginSelectionState;
        }
        this._operations.push(element);
        this._resultSelectionState = resultSelectionState;
        this._resultAlternativeVersionId = alternativeVersionId;
    }
    async undo() {
        this._pauseableEmitter.pause();
        try {
            for (let i = this._operations.length - 1; i >= 0; i--) {
                await this._operations[i].undo();
            }
            this._postUndoRedo(this._beginAlternativeVersionId);
            this._pauseableEmitter.fire({
                rawEvents: [],
                synchronous: undefined,
                versionId: this.textModel.versionId,
                endSelectionState: this._beginSelectionState
            });
        }
        finally {
            this._pauseableEmitter.resume();
        }
    }
    async redo() {
        this._pauseableEmitter.pause();
        try {
            for (let i = 0; i < this._operations.length; i++) {
                await this._operations[i].redo();
            }
            this._postUndoRedo(this._resultAlternativeVersionId);
            this._pauseableEmitter.fire({
                rawEvents: [],
                synchronous: undefined,
                versionId: this.textModel.versionId,
                endSelectionState: this._resultSelectionState
            });
        }
        finally {
            this._pauseableEmitter.resume();
        }
    }
}
class NotebookOperationManager {
    constructor(_textModel, _undoService, _pauseableEmitter, _postUndoRedo) {
        this._textModel = _textModel;
        this._undoService = _undoService;
        this._pauseableEmitter = _pauseableEmitter;
        this._postUndoRedo = _postUndoRedo;
        this._pendingStackOperation = null;
        this._isAppending = false;
    }
    isUndoStackEmpty() {
        return this._pendingStackOperation === null || this._pendingStackOperation.isEmpty;
    }
    pushStackElement(alternativeVersionId, selectionState) {
        if (this._pendingStackOperation && !this._pendingStackOperation.isEmpty) {
            this._pendingStackOperation.pushEndState(alternativeVersionId, selectionState);
            if (!this._isAppending) {
                this._undoService.pushElement(this._pendingStackOperation, this._pendingStackOperation.undoRedoGroup);
            }
        }
        this._isAppending = false;
        this._pendingStackOperation = null;
    }
    _getOrCreateEditStackElement(beginSelectionState, undoRedoGroup, alternativeVersionId) {
        return this._pendingStackOperation ??= new StackOperation(this._textModel, undoRedoGroup, this._pauseableEmitter, this._postUndoRedo, beginSelectionState, alternativeVersionId || '');
    }
    appendPreviousOperation() {
        const previous = this._undoService.getLastElement(this._textModel.uri);
        if (previous && previous.tag === 'notebookUndoRedoElement') {
            this._pendingStackOperation = previous;
            this._isAppending = true;
            return true;
        }
        return false;
    }
    pushEditOperation(element, beginSelectionState, resultSelectionState, alternativeVersionId, undoRedoGroup) {
        const pendingStackOperation = this._getOrCreateEditStackElement(beginSelectionState, undoRedoGroup, alternativeVersionId);
        pendingStackOperation.pushEditOperation(element, beginSelectionState, resultSelectionState, alternativeVersionId);
    }
}
class NotebookEventEmitter extends PauseableEmitter {
    get isEmpty() {
        return this._eventQueue.isEmpty();
    }
    isDirtyEvent() {
        for (const e of this._eventQueue) {
            for (let i = 0; i < e.rawEvents.length; i++) {
                if (!e.rawEvents[i].transient) {
                    return true;
                }
            }
        }
        return false;
    }
}
let NotebookTextModel = NotebookTextModel_1 = class NotebookTextModel extends Disposable {
    get length() {
        return this._cells.length;
    }
    get cells() {
        return this._cells;
    }
    get versionId() {
        return this._versionId;
    }
    get alternativeVersionId() {
        return this._alternativeVersionId;
    }
    get notebookType() {
        return this.viewType;
    }
    constructor(viewType, uri, cells, metadata, options, _undoService, _modelService, _languageService, _languageDetectionService, _notebookExecutionStateService) {
        super();
        this.viewType = viewType;
        this.uri = uri;
        this._undoService = _undoService;
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._languageDetectionService = _languageDetectionService;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this._isDisposed = false;
        this._onWillDispose = this._register(new Emitter());
        this._onWillAddRemoveCells = this._register(new Emitter());
        this._onDidChangeContent = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this.onWillAddRemoveCells = this._onWillAddRemoveCells.event;
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._cellhandlePool = 0;
        this._cellListeners = new Map();
        this._cells = [];
        this.metadata = {};
        this.transientOptions = { transientCellMetadata: {}, transientDocumentMetadata: {}, transientOutputs: false, cellContentMetadata: {} };
        this._versionId = 0;
        /**
         * This alternative id is only for non-cell-content changes.
         */
        this._notebookSpecificAlternativeId = 0;
        /**
         * Unlike, versionId, this can go down (via undo) or go to previous values (via redo)
         */
        this._alternativeVersionId = '1';
        this.newCellsFromLastEdit = new Set();
        this.transientOptions = options;
        this.metadata = metadata;
        this._initialize(cells);
        const maybeUpdateCellTextModel = (textModel) => {
            if (textModel.uri.scheme === Schemas.vscodeNotebookCell && textModel instanceof TextModel) {
                const cellUri = CellUri.parse(textModel.uri);
                if (cellUri && isEqual(cellUri.notebook, this.uri)) {
                    const cellIdx = this._getCellIndexByHandle(cellUri.handle);
                    if (cellIdx >= 0) {
                        const cell = this.cells[cellIdx];
                        if (cell) {
                            cell.textModel = textModel;
                        }
                    }
                }
            }
        };
        this._register(_modelService.onModelAdded(e => maybeUpdateCellTextModel(e)));
        this._pauseableEmitter = new NotebookEventEmitter({
            merge: (events) => {
                const first = events[0];
                const rawEvents = first.rawEvents;
                let versionId = first.versionId;
                let endSelectionState = first.endSelectionState;
                let synchronous = first.synchronous;
                for (let i = 1; i < events.length; i++) {
                    rawEvents.push(...events[i].rawEvents);
                    versionId = events[i].versionId;
                    endSelectionState = events[i].endSelectionState !== undefined ? events[i].endSelectionState : endSelectionState;
                    synchronous = events[i].synchronous !== undefined ? events[i].synchronous : synchronous;
                }
                return { rawEvents, versionId, endSelectionState, synchronous };
            }
        });
        this._register(this._pauseableEmitter.event(e => {
            if (e.rawEvents.length) {
                this._onDidChangeContent.fire(e);
            }
        }));
        this._operationManager = new NotebookOperationManager(this, this._undoService, this._pauseableEmitter, (alternativeVersionId) => {
            this._increaseVersionId(true);
            this._overwriteAlternativeVersionId(alternativeVersionId);
        });
    }
    setCellCollapseDefault(collapseConfig) {
        this._defaultCollapseConfig = collapseConfig;
    }
    _initialize(cells, triggerDirty) {
        this._cells = [];
        this._versionId = 0;
        this._notebookSpecificAlternativeId = 0;
        const mainCells = cells.map(cell => {
            const cellHandle = this._cellhandlePool++;
            const cellUri = CellUri.generate(this.uri, cellHandle);
            const collapseState = this._getDefaultCollapseState(cell);
            return new NotebookCellTextModel(cellUri, cellHandle, cell.source, cell.language, cell.mime, cell.cellKind, cell.outputs, cell.metadata, cell.internalMetadata, collapseState, this.transientOptions, this._languageService, this._languageDetectionService);
        });
        for (let i = 0; i < mainCells.length; i++) {
            const dirtyStateListener = mainCells[i].onDidChangeContent((e) => {
                this._bindCellContentHandler(mainCells[i], e);
            });
            this._cellListeners.set(mainCells[i].handle, dirtyStateListener);
            this._register(mainCells[i]);
        }
        this._cells.splice(0, 0, ...mainCells);
        this._alternativeVersionId = this._generateAlternativeId();
        if (triggerDirty) {
            this._pauseableEmitter.fire({
                rawEvents: [{ kind: NotebookCellsChangeType.Unknown, transient: false }],
                versionId: this.versionId,
                synchronous: true,
                endSelectionState: undefined
            });
        }
    }
    _bindCellContentHandler(cell, e) {
        this._increaseVersionId(e === 'content' || (typeof e === 'object' && e.type === 'model'));
        switch (e) {
            case 'content':
                this._pauseableEmitter.fire({
                    rawEvents: [{ kind: NotebookCellsChangeType.ChangeCellContent, index: this._getCellIndexByHandle(cell.handle), transient: false }],
                    versionId: this.versionId,
                    synchronous: true,
                    endSelectionState: undefined
                });
                break;
            case 'language':
                this._pauseableEmitter.fire({
                    rawEvents: [{ kind: NotebookCellsChangeType.ChangeCellLanguage, index: this._getCellIndexByHandle(cell.handle), language: cell.language, transient: false }],
                    versionId: this.versionId,
                    synchronous: true,
                    endSelectionState: undefined
                });
                break;
            case 'mime':
                this._pauseableEmitter.fire({
                    rawEvents: [{ kind: NotebookCellsChangeType.ChangeCellMime, index: this._getCellIndexByHandle(cell.handle), mime: cell.mime, transient: false }],
                    versionId: this.versionId,
                    synchronous: true,
                    endSelectionState: undefined
                });
                break;
            default:
                if (typeof e === 'object' && e.type === 'model') {
                    this._pauseableEmitter.fire({
                        rawEvents: [{ kind: NotebookCellsChangeType.ChangeCellContent, index: this._getCellIndexByHandle(cell.handle), transient: false }],
                        versionId: this.versionId,
                        synchronous: true,
                        endSelectionState: undefined
                    });
                }
                break;
        }
    }
    _generateAlternativeId() {
        return `${this._notebookSpecificAlternativeId}_` + this.cells.map(cell => cell.handle + ',' + cell.alternativeId).join(';');
    }
    dispose() {
        if (this._isDisposed) {
            // NotebookEditorModel can be disposed twice, don't fire onWillDispose again
            return;
        }
        this._isDisposed = true;
        this._onWillDispose.fire();
        this._undoService.removeElements(this.uri);
        dispose(this._cellListeners.values());
        this._cellListeners.clear();
        dispose(this._cells);
        this._cells = [];
        super.dispose();
    }
    pushStackElement() {
        // https://github.com/microsoft/vscode/issues/207523
    }
    _getCellIndexByHandle(handle) {
        return this.cells.findIndex(c => c.handle === handle);
    }
    _getCellIndexWithOutputIdHandleFromEdits(outputId, rawEdits) {
        const edit = rawEdits.find(e => 'outputs' in e && e.outputs.some(o => o.outputId === outputId));
        if (edit) {
            if ('index' in edit) {
                return edit.index;
            }
            else if ('handle' in edit) {
                const cellIndex = this._getCellIndexByHandle(edit.handle);
                this._assertIndex(cellIndex);
                return cellIndex;
            }
        }
        return -1;
    }
    _getCellIndexWithOutputIdHandle(outputId) {
        return this.cells.findIndex(c => !!c.outputs.find(o => o.outputId === outputId));
    }
    reset(cells, metadata, transientOptions) {
        this.transientOptions = transientOptions;
        const executions = this._notebookExecutionStateService.getCellExecutionsForNotebook(this.uri);
        const executingCellHandles = executions.filter(exe => exe.state === NotebookCellExecutionState.Executing).map(exe => exe.cellHandle);
        const edits = NotebookTextModel_1.computeEdits(this, cells, executingCellHandles);
        this.applyEdits([
            ...edits,
            { editType: 5 /* CellEditType.DocumentMetadata */, metadata }
        ], true, undefined, () => undefined, undefined, false);
    }
    createSnapshot(options) {
        const transientOptions = options.transientOptions ?? this.transientOptions;
        const data = {
            metadata: filter(this.metadata, key => !transientOptions.transientDocumentMetadata[key]),
            cells: [],
        };
        let outputSize = 0;
        for (const cell of this.cells) {
            const cellData = {
                cellKind: cell.cellKind,
                language: cell.language,
                mime: cell.mime,
                source: cell.getValue(),
                outputs: [],
                internalMetadata: cell.internalMetadata
            };
            if (options.context === 2 /* SnapshotContext.Backup */ && options.outputSizeLimit > 0) {
                cell.outputs.forEach(output => {
                    output.outputs.forEach(item => {
                        outputSize += item.data.byteLength;
                    });
                });
                if (outputSize > options.outputSizeLimit) {
                    throw new Error('Notebook too large to backup');
                }
            }
            cellData.outputs = !transientOptions.transientOutputs ? cell.outputs : [];
            cellData.metadata = filter(cell.metadata, key => !transientOptions.transientCellMetadata[key]);
            data.cells.push(cellData);
        }
        return data;
    }
    restoreSnapshot(snapshot, transientOptions) {
        this.reset(snapshot.cells, snapshot.metadata, transientOptions ?? this.transientOptions);
    }
    static computeEdits(model, cells, executingHandles = []) {
        const edits = [];
        const isExecuting = (cell) => executingHandles.includes(cell.handle);
        const commonPrefix = this._commonPrefix(model.cells, model.cells.length, 0, cells, cells.length, 0, isExecuting);
        if (commonPrefix > 0) {
            for (let i = 0; i < commonPrefix; i++) {
                edits.push({
                    editType: 3 /* CellEditType.Metadata */,
                    index: i,
                    metadata: cells[i].metadata ?? {}
                }, ...this._computeOutputEdit(i, model.cells[i].outputs, cells[i].outputs));
            }
        }
        if (model.cells.length === cells.length && commonPrefix === model.cells.length) {
            return edits;
        }
        const commonSuffix = this._commonSuffix(model.cells, model.cells.length - commonPrefix, commonPrefix, cells, cells.length - commonPrefix, commonPrefix, isExecuting);
        if (commonSuffix > 0) {
            edits.push({ editType: 1 /* CellEditType.Replace */, index: commonPrefix, count: model.cells.length - commonPrefix - commonSuffix, cells: cells.slice(commonPrefix, cells.length - commonSuffix) });
        }
        else if (commonPrefix > 0) {
            edits.push({ editType: 1 /* CellEditType.Replace */, index: commonPrefix, count: model.cells.length - commonPrefix, cells: cells.slice(commonPrefix) });
        }
        else {
            edits.push({ editType: 1 /* CellEditType.Replace */, index: 0, count: model.cells.length, cells });
        }
        if (commonSuffix > 0) {
            // has same suffix
            for (let i = commonSuffix; i > 0; i--) {
                edits.push({
                    editType: 3 /* CellEditType.Metadata */,
                    index: model.cells.length - i,
                    metadata: cells[cells.length - i].metadata ?? {}
                }, ...this._computeOutputEdit(model.cells.length - i, model.cells[model.cells.length - i].outputs, cells[cells.length - i].outputs));
            }
        }
        return edits;
    }
    static _computeOutputEdit(index, a, b) {
        if (a.length !== b.length) {
            return [
                {
                    editType: 2 /* CellEditType.Output */,
                    index: index,
                    outputs: b,
                    append: false
                }
            ];
        }
        if (a.length === 0) {
            // no output
            return [];
        }
        // same length
        return b.map((output, i) => {
            return {
                editType: 7 /* CellEditType.OutputItems */,
                outputId: a[i].outputId,
                items: output.outputs,
                append: false
            };
        });
    }
    static _commonPrefix(a, aLen, aDelta, b, bLen, bDelta, isExecuting) {
        const maxResult = Math.min(aLen, bLen);
        let result = 0;
        for (let i = 0; i < maxResult && a[aDelta + i].fastEqual(b[bDelta + i], isExecuting(a[aDelta + i])); i++) {
            result++;
        }
        return result;
    }
    static _commonSuffix(a, aLen, aDelta, b, bLen, bDelta, isExecuting) {
        const maxResult = Math.min(aLen, bLen);
        let result = 0;
        for (let i = 0; i < maxResult && a[aDelta + aLen - i - 1].fastEqual(b[bDelta + bLen - i - 1], isExecuting(a[aDelta + aLen - i - 1])); i++) {
            result++;
        }
        return result;
    }
    isOnlyEditingMetadataOnNewCells(rawEdits) {
        for (const edit of rawEdits) {
            if (edit.editType === 9 /* CellEditType.PartialInternalMetadata */) {
                continue;
            }
            if (edit.editType !== 3 /* CellEditType.Metadata */ && edit.editType !== 8 /* CellEditType.PartialMetadata */) {
                return false;
            }
            if (('index' in edit) && !this.newCellsFromLastEdit.has(this.cells[edit.index].handle)) {
                return false;
            }
            if ('handle' in edit && !this.newCellsFromLastEdit.has(edit.handle)) {
                return false;
            }
        }
        return true;
    }
    applyEdits(rawEdits, synchronous, beginSelectionState, endSelectionsComputer, undoRedoGroup, computeUndoRedo) {
        this._pauseableEmitter.pause();
        this._operationManager.pushStackElement(this._alternativeVersionId, undefined);
        if (computeUndoRedo && this.isOnlyEditingMetadataOnNewCells(rawEdits)) {
            if (!this._operationManager.appendPreviousOperation()) {
                // we can't append the previous operation, so just don't compute undo/redo
                computeUndoRedo = false;
            }
        }
        else if (computeUndoRedo) {
            this.newCellsFromLastEdit.clear();
        }
        try {
            this._doApplyEdits(rawEdits, synchronous, computeUndoRedo, beginSelectionState, undoRedoGroup);
            return true;
        }
        finally {
            if (!this._pauseableEmitter.isEmpty) {
                // Update selection and versionId after applying edits.
                const endSelections = endSelectionsComputer();
                this._increaseVersionId(this._operationManager.isUndoStackEmpty() && !this._pauseableEmitter.isDirtyEvent());
                // Finalize undo element
                this._operationManager.pushStackElement(this._alternativeVersionId, endSelections);
                // Broadcast changes
                this._pauseableEmitter.fire({ rawEvents: [], versionId: this.versionId, synchronous: synchronous, endSelectionState: endSelections });
            }
            this._pauseableEmitter.resume();
        }
    }
    _doApplyEdits(rawEdits, synchronous, computeUndoRedo, beginSelectionState, undoRedoGroup) {
        const editsWithDetails = rawEdits.map((edit, index) => {
            let cellIndex = -1;
            if ('index' in edit) {
                cellIndex = edit.index;
            }
            else if ('handle' in edit) {
                cellIndex = this._getCellIndexByHandle(edit.handle);
                this._assertIndex(cellIndex);
            }
            else if ('outputId' in edit) {
                cellIndex = this._getCellIndexWithOutputIdHandle(edit.outputId);
                if (this._indexIsInvalid(cellIndex)) {
                    // The referenced output may have been created in this batch of edits
                    cellIndex = this._getCellIndexWithOutputIdHandleFromEdits(edit.outputId, rawEdits.slice(0, index));
                }
                if (this._indexIsInvalid(cellIndex)) {
                    // It's possible for an edit to refer to an output which was just cleared, ignore it without throwing
                    return null;
                }
            }
            else if (edit.editType !== 5 /* CellEditType.DocumentMetadata */) {
                throw new Error('Invalid cell edit');
            }
            return {
                edit,
                cellIndex,
                end: (edit.editType === 5 /* CellEditType.DocumentMetadata */)
                    ? undefined
                    : (edit.editType === 1 /* CellEditType.Replace */ ? edit.index + edit.count : cellIndex),
                originalIndex: index
            };
        }).filter(isDefined);
        // compress all edits which have no side effects on cell index
        const edits = this._mergeCellEdits(editsWithDetails)
            .sort((a, b) => {
            if (a.end === undefined) {
                return -1;
            }
            if (b.end === undefined) {
                return -1;
            }
            return b.end - a.end || b.originalIndex - a.originalIndex;
        }).reduce((prev, curr) => {
            if (!prev.length) {
                // empty
                prev.push([curr]);
            }
            else {
                const last = prev[prev.length - 1];
                const index = last[0].cellIndex;
                if (curr.cellIndex === index) {
                    last.push(curr);
                }
                else {
                    prev.push([curr]);
                }
            }
            return prev;
        }, []).map(editsOnSameIndex => {
            const replaceEdits = [];
            const otherEdits = [];
            editsOnSameIndex.forEach(edit => {
                if (edit.edit.editType === 1 /* CellEditType.Replace */) {
                    replaceEdits.push(edit);
                }
                else {
                    otherEdits.push(edit);
                }
            });
            return [...otherEdits.reverse(), ...replaceEdits];
        });
        const flattenEdits = edits.flat();
        for (const { edit, cellIndex } of flattenEdits) {
            switch (edit.editType) {
                case 1 /* CellEditType.Replace */:
                    this._replaceCells(edit.index, edit.count, edit.cells, synchronous, computeUndoRedo, beginSelectionState, undoRedoGroup);
                    break;
                case 2 /* CellEditType.Output */: {
                    this._assertIndex(cellIndex);
                    const cell = this._cells[cellIndex];
                    if (edit.append) {
                        this._spliceNotebookCellOutputs(cell, { start: cell.outputs.length, deleteCount: 0, newOutputs: edit.outputs.map(op => new NotebookCellOutputTextModel(op)) }, true, computeUndoRedo);
                    }
                    else {
                        this._spliceNotebookCellOutputs2(cell, edit.outputs, computeUndoRedo);
                    }
                    break;
                }
                case 7 /* CellEditType.OutputItems */:
                    {
                        this._assertIndex(cellIndex);
                        const cell = this._cells[cellIndex];
                        if (edit.append) {
                            this._appendNotebookCellOutputItems(cell, edit.outputId, edit.items);
                        }
                        else {
                            this._replaceNotebookCellOutputItems(cell, edit.outputId, edit.items);
                        }
                    }
                    break;
                case 3 /* CellEditType.Metadata */:
                    this._assertIndex(edit.index);
                    this._changeCellMetadata(this._cells[edit.index], edit.metadata, computeUndoRedo, beginSelectionState, undoRedoGroup);
                    break;
                case 8 /* CellEditType.PartialMetadata */:
                    this._assertIndex(cellIndex);
                    this._changeCellMetadataPartial(this._cells[cellIndex], edit.metadata, computeUndoRedo, beginSelectionState, undoRedoGroup);
                    break;
                case 9 /* CellEditType.PartialInternalMetadata */:
                    this._assertIndex(cellIndex);
                    this._changeCellInternalMetadataPartial(this._cells[cellIndex], edit.internalMetadata);
                    break;
                case 4 /* CellEditType.CellLanguage */:
                    this._assertIndex(edit.index);
                    this._changeCellLanguage(this._cells[edit.index], edit.language, computeUndoRedo, beginSelectionState, undoRedoGroup);
                    break;
                case 5 /* CellEditType.DocumentMetadata */:
                    this._updateNotebookCellMetadata(edit.metadata, computeUndoRedo, beginSelectionState, undoRedoGroup);
                    break;
                case 6 /* CellEditType.Move */:
                    this._moveCellToIdx(edit.index, edit.length, edit.newIdx, synchronous, computeUndoRedo, beginSelectionState, undefined, undoRedoGroup);
                    break;
            }
        }
    }
    _mergeCellEdits(rawEdits) {
        const mergedEdits = [];
        rawEdits.forEach(edit => {
            if (mergedEdits.length) {
                const last = mergedEdits[mergedEdits.length - 1];
                if (last.edit.editType === 2 /* CellEditType.Output */
                    && last.edit.append
                    && edit.edit.editType === 2 /* CellEditType.Output */
                    && edit.edit.append
                    && last.cellIndex === edit.cellIndex) {
                    last.edit.outputs = [...last.edit.outputs, ...edit.edit.outputs];
                }
                else if (last.edit.editType === 2 /* CellEditType.Output */
                    && !last.edit.append // last cell is not append
                    && last.edit.outputs.length === 0 // last cell is clear outputs
                    && edit.edit.editType === 2 /* CellEditType.Output */
                    && edit.edit.append
                    && last.cellIndex === edit.cellIndex) {
                    last.edit.append = false;
                    last.edit.outputs = edit.edit.outputs;
                }
                else {
                    mergedEdits.push(edit);
                }
            }
            else {
                mergedEdits.push(edit);
            }
        });
        return mergedEdits;
    }
    _getDefaultCollapseState(cellDto) {
        const defaultConfig = cellDto.cellKind === CellKind.Code ? this._defaultCollapseConfig?.codeCell : this._defaultCollapseConfig?.markupCell;
        return cellDto.collapseState ?? (defaultConfig ?? undefined);
    }
    _replaceCells(index, count, cellDtos, synchronous, computeUndoRedo, beginSelectionState, undoRedoGroup) {
        if (count === 0 && cellDtos.length === 0) {
            return;
        }
        const oldViewCells = this._cells.slice(0);
        const oldSet = new Set();
        oldViewCells.forEach(cell => {
            oldSet.add(cell.handle);
        });
        // prepare remove
        for (let i = index; i < Math.min(index + count, this._cells.length); i++) {
            const cell = this._cells[i];
            this._cellListeners.get(cell.handle)?.dispose();
            this._cellListeners.delete(cell.handle);
        }
        // prepare add
        const cells = cellDtos.map(cellDto => {
            const cellHandle = this._cellhandlePool++;
            const cellUri = CellUri.generate(this.uri, cellHandle);
            const collapseState = this._getDefaultCollapseState(cellDto);
            const cell = new NotebookCellTextModel(cellUri, cellHandle, cellDto.source, cellDto.language, cellDto.mime, cellDto.cellKind, cellDto.outputs || [], cellDto.metadata, cellDto.internalMetadata, collapseState, this.transientOptions, this._languageService, this._languageDetectionService);
            const textModel = this._modelService.getModel(cellUri);
            if (textModel && textModel instanceof TextModel) {
                cell.textModel = textModel;
                cell.language = cellDto.language;
                cell.textModel.setValue(cellDto.source);
                cell.resetTextBuffer(cell.textModel.getTextBuffer());
            }
            const dirtyStateListener = cell.onDidChangeContent((e) => {
                this._bindCellContentHandler(cell, e);
            });
            this.newCellsFromLastEdit.add(cell.handle);
            this._cellListeners.set(cell.handle, dirtyStateListener);
            this._register(cell);
            return cell;
        });
        // compute change
        const cellsCopy = this._cells.slice(0);
        cellsCopy.splice(index, count, ...cells);
        const diffs = diff(this._cells, cellsCopy, cell => {
            return oldSet.has(cell.handle);
        }).map(diff => {
            return [diff.start, diff.deleteCount, diff.toInsert];
        });
        this._onWillAddRemoveCells.fire({ rawEvent: { kind: NotebookCellsChangeType.ModelChange, changes: diffs } });
        // make change
        this._cells = cellsCopy;
        const undoDiff = diffs.map(diff => {
            const deletedCells = oldViewCells.slice(diff[0], diff[0] + diff[1]);
            return [diff[0], deletedCells, diff[2]];
        });
        if (computeUndoRedo) {
            this._operationManager.pushEditOperation(new SpliceCellsEdit(this.uri, undoDiff, {
                insertCell: (index, cell, endSelections) => { this._insertNewCell(index, [cell], true, endSelections); },
                deleteCell: (index, endSelections) => { this._removeCell(index, 1, true, endSelections); },
                replaceCell: (index, count, cells, endSelections) => { this._replaceNewCells(index, count, cells, true, endSelections); },
            }, undefined, undefined), beginSelectionState, undefined, this._alternativeVersionId, undoRedoGroup);
        }
        // should be deferred
        this._pauseableEmitter.fire({
            rawEvents: [{ kind: NotebookCellsChangeType.ModelChange, changes: diffs, transient: false }],
            versionId: this.versionId,
            synchronous: synchronous,
            endSelectionState: undefined
        });
    }
    _increaseVersionId(transient) {
        this._versionId = this._versionId + 1;
        if (!transient) {
            this._notebookSpecificAlternativeId = this._versionId;
        }
        this._alternativeVersionId = this._generateAlternativeId();
    }
    _overwriteAlternativeVersionId(newAlternativeVersionId) {
        this._alternativeVersionId = newAlternativeVersionId;
        this._notebookSpecificAlternativeId = Number(newAlternativeVersionId.substring(0, newAlternativeVersionId.indexOf('_')));
    }
    _updateNotebookCellMetadata(metadata, computeUndoRedo, beginSelectionState, undoRedoGroup) {
        const oldMetadata = this.metadata;
        const triggerDirtyChange = this._isDocumentMetadataChanged(this.metadata, metadata);
        if (triggerDirtyChange) {
            if (computeUndoRedo) {
                const that = this;
                this._operationManager.pushEditOperation(new class {
                    constructor() {
                        this.type = 0 /* UndoRedoElementType.Resource */;
                        this.label = 'Update Cell Metadata';
                        this.code = 'undoredo.textBufferEdit';
                    }
                    get resource() {
                        return that.uri;
                    }
                    undo() {
                        that._updateNotebookCellMetadata(oldMetadata, false, beginSelectionState, undoRedoGroup);
                    }
                    redo() {
                        that._updateNotebookCellMetadata(metadata, false, beginSelectionState, undoRedoGroup);
                    }
                }(), beginSelectionState, undefined, this._alternativeVersionId, undoRedoGroup);
            }
        }
        this.metadata = metadata;
        this._pauseableEmitter.fire({
            rawEvents: [{ kind: NotebookCellsChangeType.ChangeDocumentMetadata, metadata: this.metadata, transient: !triggerDirtyChange }],
            versionId: this.versionId,
            synchronous: true,
            endSelectionState: undefined
        });
    }
    _insertNewCell(index, cells, synchronous, endSelections) {
        for (let i = 0; i < cells.length; i++) {
            const dirtyStateListener = cells[i].onDidChangeContent((e) => {
                this._bindCellContentHandler(cells[i], e);
            });
            this._cellListeners.set(cells[i].handle, dirtyStateListener);
        }
        const changes = [[index, 0, cells]];
        this._onWillAddRemoveCells.fire({ rawEvent: { kind: NotebookCellsChangeType.ModelChange, changes } });
        this._cells.splice(index, 0, ...cells);
        this._pauseableEmitter.fire({
            rawEvents: [{ kind: NotebookCellsChangeType.ModelChange, changes, transient: false }],
            versionId: this.versionId,
            synchronous: synchronous,
            endSelectionState: endSelections
        });
        return;
    }
    _removeCell(index, count, synchronous, endSelections) {
        for (let i = index; i < index + count; i++) {
            const cell = this._cells[i];
            this._cellListeners.get(cell.handle)?.dispose();
            this._cellListeners.delete(cell.handle);
        }
        const changes = [[index, count, []]];
        this._onWillAddRemoveCells.fire({ rawEvent: { kind: NotebookCellsChangeType.ModelChange, changes } });
        this._cells.splice(index, count);
        this._pauseableEmitter.fire({
            rawEvents: [{ kind: NotebookCellsChangeType.ModelChange, changes, transient: false }],
            versionId: this.versionId,
            synchronous: synchronous,
            endSelectionState: endSelections
        });
    }
    _replaceNewCells(index, count, cells, synchronous, endSelections) {
        for (let i = index; i < index + count; i++) {
            const cell = this._cells[i];
            this._cellListeners.get(cell.handle)?.dispose();
            this._cellListeners.delete(cell.handle);
        }
        for (let i = 0; i < cells.length; i++) {
            const dirtyStateListener = cells[i].onDidChangeContent((e) => {
                this._bindCellContentHandler(cells[i], e);
            });
            this._cellListeners.set(cells[i].handle, dirtyStateListener);
        }
        const changes = [[index, count, cells]];
        this._onWillAddRemoveCells.fire({ rawEvent: { kind: NotebookCellsChangeType.ModelChange, changes } });
        this._cells.splice(index, count, ...cells);
        this._pauseableEmitter.fire({
            rawEvents: [{ kind: NotebookCellsChangeType.ModelChange, changes, transient: false }],
            versionId: this.versionId,
            synchronous: synchronous,
            endSelectionState: endSelections
        });
    }
    _isDocumentMetadataChanged(a, b) {
        const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
        for (const key of keys) {
            if (key === 'custom') {
                if (!this._customMetadataEqual(a[key], b[key])
                    &&
                        !(this.transientOptions.transientDocumentMetadata[key])) {
                    return true;
                }
            }
            else if ((a[key] !== b[key])
                &&
                    !(this.transientOptions.transientDocumentMetadata[key])) {
                return true;
            }
        }
        return false;
    }
    _isCellMetadataChanged(a, b) {
        const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
        for (const key of keys) {
            if ((a[key] !== b[key])
                &&
                    !(this.transientOptions.transientCellMetadata[key])) {
                return true;
            }
        }
        return false;
    }
    _customMetadataEqual(a, b) {
        if (!a && !b) {
            // both of them are nullish or undefined
            return true;
        }
        if (!a || !b) {
            return false;
        }
        const aProps = Object.getOwnPropertyNames(a);
        const bProps = Object.getOwnPropertyNames(b);
        if (aProps.length !== bProps.length) {
            return false;
        }
        for (let i = 0; i < aProps.length; i++) {
            const propName = aProps[i];
            if (a[propName] !== b[propName]) {
                return false;
            }
        }
        return true;
    }
    _changeCellMetadataPartial(cell, metadata, computeUndoRedo, beginSelectionState, undoRedoGroup) {
        const newMetadata = {
            ...cell.metadata
        };
        let k;
        for (k in metadata) {
            const value = metadata[k] ?? undefined;
            newMetadata[k] = value;
        }
        return this._changeCellMetadata(cell, newMetadata, computeUndoRedo, beginSelectionState, undoRedoGroup);
    }
    _changeCellMetadata(cell, metadata, computeUndoRedo, beginSelectionState, undoRedoGroup) {
        const triggerDirtyChange = this._isCellMetadataChanged(cell.metadata, metadata);
        if (triggerDirtyChange) {
            if (computeUndoRedo) {
                const index = this._cells.indexOf(cell);
                this._operationManager.pushEditOperation(new CellMetadataEdit(this.uri, index, Object.freeze(cell.metadata), Object.freeze(metadata), {
                    updateCellMetadata: (index, newMetadata) => {
                        const cell = this._cells[index];
                        if (!cell) {
                            return;
                        }
                        this._changeCellMetadata(cell, newMetadata, false, beginSelectionState, undoRedoGroup);
                    }
                }), beginSelectionState, undefined, this._alternativeVersionId, undoRedoGroup);
            }
        }
        // should be deferred
        cell.metadata = metadata;
        this._pauseableEmitter.fire({
            rawEvents: [{ kind: NotebookCellsChangeType.ChangeCellMetadata, index: this._cells.indexOf(cell), metadata: cell.metadata, transient: !triggerDirtyChange }],
            versionId: this.versionId,
            synchronous: true,
            endSelectionState: undefined
        });
    }
    _changeCellInternalMetadataPartial(cell, internalMetadata) {
        const newInternalMetadata = {
            ...cell.internalMetadata
        };
        let k;
        for (k in internalMetadata) {
            const value = internalMetadata[k] ?? undefined;
            newInternalMetadata[k] = value;
        }
        cell.internalMetadata = newInternalMetadata;
        this._pauseableEmitter.fire({
            rawEvents: [{ kind: NotebookCellsChangeType.ChangeCellInternalMetadata, index: this._cells.indexOf(cell), internalMetadata: cell.internalMetadata, transient: true }],
            versionId: this.versionId,
            synchronous: true,
            endSelectionState: undefined
        });
    }
    _changeCellLanguage(cell, languageId, computeUndoRedo, beginSelectionState, undoRedoGroup) {
        if (cell.language === languageId) {
            return;
        }
        const oldLanguage = cell.language;
        cell.language = languageId;
        if (computeUndoRedo) {
            const that = this;
            this._operationManager.pushEditOperation(new class {
                constructor() {
                    this.type = 0 /* UndoRedoElementType.Resource */;
                    this.label = 'Update Cell Language';
                    this.code = 'undoredo.textBufferEdit';
                }
                get resource() {
                    return that.uri;
                }
                undo() {
                    that._changeCellLanguage(cell, oldLanguage, false, beginSelectionState, undoRedoGroup);
                }
                redo() {
                    that._changeCellLanguage(cell, languageId, false, beginSelectionState, undoRedoGroup);
                }
            }(), beginSelectionState, undefined, this._alternativeVersionId, undoRedoGroup);
        }
        this._pauseableEmitter.fire({
            rawEvents: [{ kind: NotebookCellsChangeType.ChangeCellLanguage, index: this._cells.indexOf(cell), language: languageId, transient: false }],
            versionId: this.versionId,
            synchronous: true,
            endSelectionState: undefined
        });
    }
    _spliceNotebookCellOutputs2(cell, outputs, computeUndoRedo) {
        if (outputs.length === 0 && cell.outputs.length === 0) {
            return;
        }
        if (outputs.length <= 1) {
            this._spliceNotebookCellOutputs(cell, { start: 0, deleteCount: cell.outputs.length, newOutputs: outputs.map(op => new NotebookCellOutputTextModel(op)) }, false, computeUndoRedo);
            return;
        }
        const diff = new LcsDiff(new OutputSequence(cell.outputs), new OutputSequence(outputs));
        const diffResult = diff.ComputeDiff(false);
        const splices = diffResult.changes.map(change => ({
            start: change.originalStart,
            deleteCount: change.originalLength,
            // create cell output text model only when it's inserted into the notebook document
            newOutputs: outputs.slice(change.modifiedStart, change.modifiedStart + change.modifiedLength).map(op => new NotebookCellOutputTextModel(op))
        }));
        splices.reverse().forEach(splice => {
            this._spliceNotebookCellOutputs(cell, splice, false, computeUndoRedo);
        });
    }
    _spliceNotebookCellOutputs(cell, splice, append, computeUndoRedo) {
        cell.spliceNotebookCellOutputs(splice);
        this._pauseableEmitter.fire({
            rawEvents: [{
                    kind: NotebookCellsChangeType.Output,
                    index: this._cells.indexOf(cell),
                    outputs: cell.outputs.map(output => output.asDto()) ?? [],
                    append,
                    transient: this.transientOptions.transientOutputs,
                }],
            versionId: this.versionId,
            synchronous: true,
            endSelectionState: undefined
        });
    }
    _appendNotebookCellOutputItems(cell, outputId, items) {
        if (cell.changeOutputItems(outputId, true, items)) {
            this._pauseableEmitter.fire({
                rawEvents: [{
                        kind: NotebookCellsChangeType.OutputItem,
                        index: this._cells.indexOf(cell),
                        outputId: outputId,
                        outputItems: items,
                        append: true,
                        transient: this.transientOptions.transientOutputs
                    }],
                versionId: this.versionId,
                synchronous: true,
                endSelectionState: undefined
            });
        }
    }
    _replaceNotebookCellOutputItems(cell, outputId, items) {
        if (cell.changeOutputItems(outputId, false, items)) {
            this._pauseableEmitter.fire({
                rawEvents: [{
                        kind: NotebookCellsChangeType.OutputItem,
                        index: this._cells.indexOf(cell),
                        outputId: outputId,
                        outputItems: items,
                        append: false,
                        transient: this.transientOptions.transientOutputs
                    }],
                versionId: this.versionId,
                synchronous: true,
                endSelectionState: undefined
            });
        }
    }
    _moveCellToIdx(index, length, newIdx, synchronous, pushedToUndoStack, beforeSelections, endSelections, undoRedoGroup) {
        if (pushedToUndoStack) {
            this._operationManager.pushEditOperation(new MoveCellEdit(this.uri, index, length, newIdx, {
                moveCell: (fromIndex, length, toIndex, beforeSelections, endSelections) => {
                    this._moveCellToIdx(fromIndex, length, toIndex, true, false, beforeSelections, endSelections, undoRedoGroup);
                },
            }, beforeSelections, endSelections), beforeSelections, endSelections, this._alternativeVersionId, undoRedoGroup);
        }
        this._assertIndex(index);
        this._assertIndex(newIdx);
        const cells = this._cells.splice(index, length);
        this._cells.splice(newIdx, 0, ...cells);
        this._pauseableEmitter.fire({
            rawEvents: [{ kind: NotebookCellsChangeType.Move, index, length, newIdx, cells, transient: false }],
            versionId: this.versionId,
            synchronous: synchronous,
            endSelectionState: endSelections
        });
        return true;
    }
    _assertIndex(index) {
        if (this._indexIsInvalid(index)) {
            throw new Error(`model index out of range ${index}`);
        }
    }
    _indexIsInvalid(index) {
        return index < 0 || index >= this._cells.length;
    }
    //#region Find
    findNextMatch(searchString, searchStart, isRegex, matchCase, wordSeparators, searchEnd) {
        // check if search cell index is valid
        this._assertIndex(searchStart.cellIndex);
        const searchParams = new SearchParams(searchString, isRegex, matchCase, wordSeparators);
        const searchData = searchParams.parseSearchRequest();
        if (!searchData) {
            return null;
        }
        let cellIndex = searchStart.cellIndex;
        let searchStartPosition = searchStart.position;
        let searchEndCell = this._cells.length;
        while (cellIndex < searchEndCell) {
            const cell = this._cells[cellIndex];
            // if we have wrapped back to the point of the initial search cell, we search from beginning to the provided searchEnd position
            const wrapFlag = searchEnd && cellIndex === searchEnd.cellIndex && searchStartPosition.isBefore(searchEnd.position);
            const searchRange = new Range(searchStartPosition.lineNumber, searchStartPosition.column, (wrapFlag) ? searchEnd.position.lineNumber : cell.textBuffer.getLineCount(), (wrapFlag) ? searchEnd.position.column : cell.textBuffer.getLineMaxColumn(cell.textBuffer.getLineCount()));
            const result = cell.textBuffer.findMatchesLineByLine(searchRange, searchData, false, 1);
            if (result.length > 0) {
                return { cell, match: result[0] };
            }
            else if (wrapFlag) { // this means there are no more valid matches in the notebook
                break;
            }
            // Move to the next cell
            cellIndex++;
            // wrap if a searchEnd is provided and we are past the end of the notebook
            if (searchEnd && cellIndex >= this._cells.length) {
                cellIndex = 0;
                searchEndCell = searchEnd.cellIndex + 1;
            }
            searchStartPosition = new Position(1, 1); // Reset position to start of the next cell
        }
        return null;
    }
    findMatches(searchString, isRegex, matchCase, wordSeparators) {
        const searchParams = new SearchParams(searchString, isRegex, matchCase, wordSeparators);
        const searchData = searchParams.parseSearchRequest();
        if (!searchData) {
            return [];
        }
        const results = [];
        for (const cell of this._cells) {
            const searchRange = new Range(1, 1, cell.textBuffer.getLineCount(), cell.textBuffer.getLineMaxColumn(cell.textBuffer.getLineCount()));
            const matches = cell.textBuffer.findMatchesLineByLine(searchRange, searchData, false, 1000);
            if (matches.length > 0) {
                results.push({ cell, matches: matches });
            }
        }
        return results;
    }
};
NotebookTextModel = NotebookTextModel_1 = __decorate([
    __param(5, IUndoRedoService),
    __param(6, IModelService),
    __param(7, ILanguageService),
    __param(8, ILanguageDetectionService),
    __param(9, INotebookExecutionStateService)
], NotebookTextModel);
export { NotebookTextModel };
class OutputSequence {
    constructor(outputs) {
        this.outputs = outputs;
    }
    getElements() {
        return this.outputs.map(output => {
            return hash(output.outputs.map(output => ({
                mime: output.mime,
                data: output.data
            })));
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tUZXh0TW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9jb21tb24vbW9kZWwvbm90ZWJvb2tUZXh0TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBYSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsT0FBTyxFQUFTLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdkYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFlLE1BQU0seUNBQXlDLENBQUM7QUFDM0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRWhFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFFdEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNyRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFL0UsT0FBTyxFQUE4QyxnQkFBZ0IsRUFB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