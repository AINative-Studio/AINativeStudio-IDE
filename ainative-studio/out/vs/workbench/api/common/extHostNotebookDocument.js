/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../base/common/network.js';
import { URI } from '../../../base/common/uri.js';
import * as extHostTypeConverters from './extHostTypeConverters.js';
import { NotebookRange } from './extHostTypes.js';
import * as notebookCommon from '../../contrib/notebook/common/notebookCommon.js';
class RawContentChangeEvent {
    constructor(start, deletedCount, deletedItems, items) {
        this.start = start;
        this.deletedCount = deletedCount;
        this.deletedItems = deletedItems;
        this.items = items;
    }
    asApiEvent() {
        return {
            range: new NotebookRange(this.start, this.start + this.deletedCount),
            addedCells: this.items.map(cell => cell.apiCell),
            removedCells: this.deletedItems,
        };
    }
}
export class ExtHostCell {
    static asModelAddData(cell) {
        return {
            EOL: cell.eol,
            lines: cell.source,
            languageId: cell.language,
            uri: cell.uri,
            isDirty: false,
            versionId: 1,
            encoding: 'utf8'
        };
    }
    constructor(notebook, _extHostDocument, _cellData) {
        this.notebook = notebook;
        this._extHostDocument = _extHostDocument;
        this._cellData = _cellData;
        this.handle = _cellData.handle;
        this.uri = URI.revive(_cellData.uri);
        this.cellKind = _cellData.cellKind;
        this._outputs = _cellData.outputs.map(extHostTypeConverters.NotebookCellOutput.to);
        this._internalMetadata = _cellData.internalMetadata ?? {};
        this._metadata = Object.freeze(_cellData.metadata ?? {});
        this._previousResult = Object.freeze(extHostTypeConverters.NotebookCellExecutionSummary.to(_cellData.internalMetadata ?? {}));
    }
    get internalMetadata() {
        return this._internalMetadata;
    }
    get apiCell() {
        if (!this._apiCell) {
            const that = this;
            const data = this._extHostDocument.getDocument(this.uri);
            if (!data) {
                throw new Error(`MISSING extHostDocument for notebook cell: ${this.uri}`);
            }
            const apiCell = {
                get index() { return that.notebook.getCellIndex(that); },
                notebook: that.notebook.apiNotebook,
                kind: extHostTypeConverters.NotebookCellKind.to(this._cellData.cellKind),
                document: data.document,
                get mime() { return that._mime; },
                set mime(value) { that._mime = value; },
                get outputs() { return that._outputs.slice(0); },
                get metadata() { return that._metadata; },
                get executionSummary() { return that._previousResult; }
            };
            this._apiCell = Object.freeze(apiCell);
        }
        return this._apiCell;
    }
    setOutputs(newOutputs) {
        this._outputs = newOutputs.map(extHostTypeConverters.NotebookCellOutput.to);
    }
    setOutputItems(outputId, append, newOutputItems) {
        const newItems = newOutputItems.map(extHostTypeConverters.NotebookCellOutputItem.to);
        const output = this._outputs.find(op => op.id === outputId);
        if (output) {
            if (!append) {
                output.items.length = 0;
            }
            output.items.push(...newItems);
            if (output.items.length > 1 && output.items.every(item => notebookCommon.isTextStreamMime(item.mime))) {
                // Look for the mimes in the items, and keep track of their order.
                // Merge the streams into one output item, per mime type.
                const mimeOutputs = new Map();
                const mimeTypes = [];
                output.items.forEach(item => {
                    let items;
                    if (mimeOutputs.has(item.mime)) {
                        items = mimeOutputs.get(item.mime);
                    }
                    else {
                        items = [];
                        mimeOutputs.set(item.mime, items);
                        mimeTypes.push(item.mime);
                    }
                    items.push(item.data);
                });
                output.items.length = 0;
                mimeTypes.forEach(mime => {
                    const compressed = notebookCommon.compressOutputItemStreams(mimeOutputs.get(mime));
                    output.items.push({
                        mime,
                        data: compressed.data.buffer
                    });
                });
            }
        }
    }
    setMetadata(newMetadata) {
        this._metadata = Object.freeze(newMetadata);
    }
    setInternalMetadata(newInternalMetadata) {
        this._internalMetadata = newInternalMetadata;
        this._previousResult = Object.freeze(extHostTypeConverters.NotebookCellExecutionSummary.to(newInternalMetadata));
    }
    setMime(newMime) {
    }
}
export class ExtHostNotebookDocument {
    static { this._handlePool = 0; }
    constructor(_proxy, _textDocumentsAndEditors, _textDocuments, uri, data) {
        this._proxy = _proxy;
        this._textDocumentsAndEditors = _textDocumentsAndEditors;
        this._textDocuments = _textDocuments;
        this.uri = uri;
        this.handle = ExtHostNotebookDocument._handlePool++;
        this._cells = [];
        this._versionId = 0;
        this._isDirty = false;
        this._disposed = false;
        this._notebookType = data.viewType;
        this._metadata = Object.freeze(data.metadata ?? Object.create(null));
        this._spliceNotebookCells([[0, 0, data.cells]], true /* init -> no event*/, undefined);
        this._versionId = data.versionId;
    }
    dispose() {
        this._disposed = true;
    }
    get versionId() {
        return this._versionId;
    }
    get apiNotebook() {
        if (!this._notebook) {
            const that = this;
            const apiObject = {
                get uri() { return that.uri; },
                get version() { return that._versionId; },
                get notebookType() { return that._notebookType; },
                get isDirty() { return that._isDirty; },
                get isUntitled() { return that.uri.scheme === Schemas.untitled; },
                get isClosed() { return that._disposed; },
                get metadata() { return that._metadata; },
                get cellCount() { return that._cells.length; },
                cellAt(index) {
                    index = that._validateIndex(index);
                    return that._cells[index].apiCell;
                },
                getCells(range) {
                    const cells = range ? that._getCells(range) : that._cells;
                    return cells.map(cell => cell.apiCell);
                },
                save() {
                    return that._save();
                },
                [Symbol.for('debug.description')]() {
                    return `NotebookDocument(${this.uri.toString()})`;
                }
            };
            this._notebook = Object.freeze(apiObject);
        }
        return this._notebook;
    }
    acceptDocumentPropertiesChanged(data) {
        if (data.metadata) {
            this._metadata = Object.freeze({ ...this._metadata, ...data.metadata });
        }
    }
    acceptDirty(isDirty) {
        this._isDirty = isDirty;
    }
    acceptModelChanged(event, isDirty, newMetadata) {
        this._versionId = event.versionId;
        this._isDirty = isDirty;
        this.acceptDocumentPropertiesChanged({ metadata: newMetadata });
        const result = {
            notebook: this.apiNotebook,
            metadata: newMetadata,
            cellChanges: [],
            contentChanges: [],
        };
        const relaxedCellChanges = [];
        // -- apply change and populate content changes
        for (const rawEvent of event.rawEvents) {
            if (rawEvent.kind === notebookCommon.NotebookCellsChangeType.ModelChange) {
                this._spliceNotebookCells(rawEvent.changes, false, result.contentChanges);
            }
            else if (rawEvent.kind === notebookCommon.NotebookCellsChangeType.Move) {
                this._moveCells(rawEvent.index, rawEvent.length, rawEvent.newIdx, result.contentChanges);
            }
            else if (rawEvent.kind === notebookCommon.NotebookCellsChangeType.Output) {
                this._setCellOutputs(rawEvent.index, rawEvent.outputs);
                relaxedCellChanges.push({ cell: this._cells[rawEvent.index].apiCell, outputs: this._cells[rawEvent.index].apiCell.outputs });
            }
            else if (rawEvent.kind === notebookCommon.NotebookCellsChangeType.OutputItem) {
                this._setCellOutputItems(rawEvent.index, rawEvent.outputId, rawEvent.append, rawEvent.outputItems);
                relaxedCellChanges.push({ cell: this._cells[rawEvent.index].apiCell, outputs: this._cells[rawEvent.index].apiCell.outputs });
            }
            else if (rawEvent.kind === notebookCommon.NotebookCellsChangeType.ChangeCellLanguage) {
                this._changeCellLanguage(rawEvent.index, rawEvent.language);
                relaxedCellChanges.push({ cell: this._cells[rawEvent.index].apiCell, document: this._cells[rawEvent.index].apiCell.document });
            }
            else if (rawEvent.kind === notebookCommon.NotebookCellsChangeType.ChangeCellContent) {
                relaxedCellChanges.push({ cell: this._cells[rawEvent.index].apiCell, document: this._cells[rawEvent.index].apiCell.document });
            }
            else if (rawEvent.kind === notebookCommon.NotebookCellsChangeType.ChangeCellMime) {
                this._changeCellMime(rawEvent.index, rawEvent.mime);
            }
            else if (rawEvent.kind === notebookCommon.NotebookCellsChangeType.ChangeCellMetadata) {
                this._changeCellMetadata(rawEvent.index, rawEvent.metadata);
                relaxedCellChanges.push({ cell: this._cells[rawEvent.index].apiCell, metadata: this._cells[rawEvent.index].apiCell.metadata });
            }
            else if (rawEvent.kind === notebookCommon.NotebookCellsChangeType.ChangeCellInternalMetadata) {
                this._changeCellInternalMetadata(rawEvent.index, rawEvent.internalMetadata);
                relaxedCellChanges.push({ cell: this._cells[rawEvent.index].apiCell, executionSummary: this._cells[rawEvent.index].apiCell.executionSummary });
            }
        }
        // -- compact cellChanges
        const map = new Map();
        for (let i = 0; i < relaxedCellChanges.length; i++) {
            const relaxedCellChange = relaxedCellChanges[i];
            const existing = map.get(relaxedCellChange.cell);
            if (existing === undefined) {
                const newLen = result.cellChanges.push({
                    document: undefined,
                    executionSummary: undefined,
                    metadata: undefined,
                    outputs: undefined,
                    ...relaxedCellChange,
                });
                map.set(relaxedCellChange.cell, newLen - 1);
            }
            else {
                result.cellChanges[existing] = {
                    ...result.cellChanges[existing],
                    ...relaxedCellChange
                };
            }
        }
        // Freeze event properties so handlers cannot accidentally modify them
        Object.freeze(result);
        Object.freeze(result.cellChanges);
        Object.freeze(result.contentChanges);
        return result;
    }
    _validateIndex(index) {
        index = index | 0;
        if (index < 0) {
            return 0;
        }
        else if (index >= this._cells.length) {
            return this._cells.length - 1;
        }
        else {
            return index;
        }
    }
    _validateRange(range) {
        let start = range.start | 0;
        let end = range.end | 0;
        if (start < 0) {
            start = 0;
        }
        if (end > this._cells.length) {
            end = this._cells.length;
        }
        return range.with({ start, end });
    }
    _getCells(range) {
        range = this._validateRange(range);
        const result = [];
        for (let i = range.start; i < range.end; i++) {
            result.push(this._cells[i]);
        }
        return result;
    }
    async _save() {
        if (this._disposed) {
            return Promise.reject(new Error('Notebook has been closed'));
        }
        return this._proxy.$trySaveNotebook(this.uri);
    }
    _spliceNotebookCells(splices, initialization, bucket) {
        if (this._disposed) {
            return;
        }
        const contentChangeEvents = [];
        const addedCellDocuments = [];
        const removedCellDocuments = [];
        splices.reverse().forEach(splice => {
            const cellDtos = splice[2];
            const newCells = cellDtos.map(cell => {
                const extCell = new ExtHostCell(this, this._textDocumentsAndEditors, cell);
                if (!initialization) {
                    addedCellDocuments.push(ExtHostCell.asModelAddData(cell));
                }
                return extCell;
            });
            const changeEvent = new RawContentChangeEvent(splice[0], splice[1], [], newCells);
            const deletedItems = this._cells.splice(splice[0], splice[1], ...newCells);
            for (const cell of deletedItems) {
                removedCellDocuments.push(cell.uri);
                changeEvent.deletedItems.push(cell.apiCell);
            }
            contentChangeEvents.push(changeEvent);
        });
        this._textDocumentsAndEditors.acceptDocumentsAndEditorsDelta({
            addedDocuments: addedCellDocuments,
            removedDocuments: removedCellDocuments
        });
        if (bucket) {
            for (const changeEvent of contentChangeEvents) {
                bucket.push(changeEvent.asApiEvent());
            }
        }
    }
    _moveCells(index, length, newIdx, bucket) {
        const cells = this._cells.splice(index, length);
        this._cells.splice(newIdx, 0, ...cells);
        const changes = [
            new RawContentChangeEvent(index, length, cells.map(c => c.apiCell), []),
            new RawContentChangeEvent(newIdx, 0, [], cells)
        ];
        for (const change of changes) {
            bucket.push(change.asApiEvent());
        }
    }
    _setCellOutputs(index, outputs) {
        const cell = this._cells[index];
        cell.setOutputs(outputs);
    }
    _setCellOutputItems(index, outputId, append, outputItems) {
        const cell = this._cells[index];
        cell.setOutputItems(outputId, append, outputItems);
    }
    _changeCellLanguage(index, newLanguageId) {
        const cell = this._cells[index];
        if (cell.apiCell.document.languageId !== newLanguageId) {
            this._textDocuments.$acceptModelLanguageChanged(cell.uri, newLanguageId);
        }
    }
    _changeCellMime(index, newMime) {
        const cell = this._cells[index];
        cell.apiCell.mime = newMime;
    }
    _changeCellMetadata(index, newMetadata) {
        const cell = this._cells[index];
        cell.setMetadata(newMetadata);
    }
    _changeCellInternalMetadata(index, newInternalMetadata) {
        const cell = this._cells[index];
        cell.setInternalMetadata(newInternalMetadata);
    }
    getCellFromApiCell(apiCell) {
        return this._cells.find(cell => cell.apiCell === apiCell);
    }
    getCellFromIndex(index) {
        return this._cells[index];
    }
    getCell(cellHandle) {
        return this._cells.find(cell => cell.handle === cellHandle);
    }
    getCellIndex(cell) {
        return this._cells.indexOf(cell);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE5vdGVib29rRG9jdW1lbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdE5vdGVib29rRG9jdW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUlsRCxPQUFPLEtBQUsscUJBQXFCLE1BQU0sNEJBQTRCLENBQUM7QUFDcEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ2xELE9BQU8sS0FBSyxjQUFjLE1BQU0saURBQWlELENBQUM7QUFHbEYsTUFBTSxxQkFBcUI7SUFFMUIsWUFDVSxLQUFhLEVBQ2IsWUFBb0IsRUFDcEIsWUFBbUMsRUFDbkMsS0FBb0I7UUFIcEIsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNiLGlCQUFZLEdBQVosWUFBWSxDQUFRO1FBQ3BCLGlCQUFZLEdBQVosWUFBWSxDQUF1QjtRQUNuQyxVQUFLLEdBQUwsS0FBSyxDQUFlO0lBQzFCLENBQUM7SUFFTCxVQUFVO1FBQ1QsT0FBTztZQUNOLEtBQUssRUFBRSxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztZQUNwRSxVQUFVLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQ2hELFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtTQUMvQixDQUFDO0lBQ0gsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLFdBQVc7SUFF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