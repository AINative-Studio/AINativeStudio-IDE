/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../nls.js';
import { onUnexpectedError } from '../../../base/common/errors.js';
import { Selection } from '../core/selection.js';
import { URI } from '../../../base/common/uri.js';
import { TextChange, compressConsecutiveTextChanges } from '../core/textChange.js';
import * as buffer from '../../../base/common/buffer.js';
import { basename } from '../../../base/common/resources.js';
function uriGetComparisonKey(resource) {
    return resource.toString();
}
export class SingleModelEditStackData {
    static create(model, beforeCursorState) {
        const alternativeVersionId = model.getAlternativeVersionId();
        const eol = getModelEOL(model);
        return new SingleModelEditStackData(alternativeVersionId, alternativeVersionId, eol, eol, beforeCursorState, beforeCursorState, []);
    }
    constructor(beforeVersionId, afterVersionId, beforeEOL, afterEOL, beforeCursorState, afterCursorState, changes) {
        this.beforeVersionId = beforeVersionId;
        this.afterVersionId = afterVersionId;
        this.beforeEOL = beforeEOL;
        this.afterEOL = afterEOL;
        this.beforeCursorState = beforeCursorState;
        this.afterCursorState = afterCursorState;
        this.changes = changes;
    }
    append(model, textChanges, afterEOL, afterVersionId, afterCursorState) {
        if (textChanges.length > 0) {
            this.changes = compressConsecutiveTextChanges(this.changes, textChanges);
        }
        this.afterEOL = afterEOL;
        this.afterVersionId = afterVersionId;
        this.afterCursorState = afterCursorState;
    }
    static _writeSelectionsSize(selections) {
        return 4 + 4 * 4 * (selections ? selections.length : 0);
    }
    static _writeSelections(b, selections, offset) {
        buffer.writeUInt32BE(b, (selections ? selections.length : 0), offset);
        offset += 4;
        if (selections) {
            for (const selection of selections) {
                buffer.writeUInt32BE(b, selection.selectionStartLineNumber, offset);
                offset += 4;
                buffer.writeUInt32BE(b, selection.selectionStartColumn, offset);
                offset += 4;
                buffer.writeUInt32BE(b, selection.positionLineNumber, offset);
                offset += 4;
                buffer.writeUInt32BE(b, selection.positionColumn, offset);
                offset += 4;
            }
        }
        return offset;
    }
    static _readSelections(b, offset, dest) {
        const count = buffer.readUInt32BE(b, offset);
        offset += 4;
        for (let i = 0; i < count; i++) {
            const selectionStartLineNumber = buffer.readUInt32BE(b, offset);
            offset += 4;
            const selectionStartColumn = buffer.readUInt32BE(b, offset);
            offset += 4;
            const positionLineNumber = buffer.readUInt32BE(b, offset);
            offset += 4;
            const positionColumn = buffer.readUInt32BE(b, offset);
            offset += 4;
            dest.push(new Selection(selectionStartLineNumber, selectionStartColumn, positionLineNumber, positionColumn));
        }
        return offset;
    }
    serialize() {
        let necessarySize = (+4 // beforeVersionId
            + 4 // afterVersionId
            + 1 // beforeEOL
            + 1 // afterEOL
            + SingleModelEditStackData._writeSelectionsSize(this.beforeCursorState)
            + SingleModelEditStackData._writeSelectionsSize(this.afterCursorState)
            + 4 // change count
        );
        for (const change of this.changes) {
            necessarySize += change.writeSize();
        }
        const b = new Uint8Array(necessarySize);
        let offset = 0;
        buffer.writeUInt32BE(b, this.beforeVersionId, offset);
        offset += 4;
        buffer.writeUInt32BE(b, this.afterVersionId, offset);
        offset += 4;
        buffer.writeUInt8(b, this.beforeEOL, offset);
        offset += 1;
        buffer.writeUInt8(b, this.afterEOL, offset);
        offset += 1;
        offset = SingleModelEditStackData._writeSelections(b, this.beforeCursorState, offset);
        offset = SingleModelEditStackData._writeSelections(b, this.afterCursorState, offset);
        buffer.writeUInt32BE(b, this.changes.length, offset);
        offset += 4;
        for (const change of this.changes) {
            offset = change.write(b, offset);
        }
        return b.buffer;
    }
    static deserialize(source) {
        const b = new Uint8Array(source);
        let offset = 0;
        const beforeVersionId = buffer.readUInt32BE(b, offset);
        offset += 4;
        const afterVersionId = buffer.readUInt32BE(b, offset);
        offset += 4;
        const beforeEOL = buffer.readUInt8(b, offset);
        offset += 1;
        const afterEOL = buffer.readUInt8(b, offset);
        offset += 1;
        const beforeCursorState = [];
        offset = SingleModelEditStackData._readSelections(b, offset, beforeCursorState);
        const afterCursorState = [];
        offset = SingleModelEditStackData._readSelections(b, offset, afterCursorState);
        const changeCount = buffer.readUInt32BE(b, offset);
        offset += 4;
        const changes = [];
        for (let i = 0; i < changeCount; i++) {
            offset = TextChange.read(b, offset, changes);
        }
        return new SingleModelEditStackData(beforeVersionId, afterVersionId, beforeEOL, afterEOL, beforeCursorState, afterCursorState, changes);
    }
}
export class SingleModelEditStackElement {
    get type() {
        return 0 /* UndoRedoElementType.Resource */;
    }
    get resource() {
        if (URI.isUri(this.model)) {
            return this.model;
        }
        return this.model.uri;
    }
    constructor(label, code, model, beforeCursorState) {
        this.label = label;
        this.code = code;
        this.model = model;
        this._data = SingleModelEditStackData.create(model, beforeCursorState);
    }
    toString() {
        const data = (this._data instanceof SingleModelEditStackData ? this._data : SingleModelEditStackData.deserialize(this._data));
        return data.changes.map(change => change.toString()).join(', ');
    }
    matchesResource(resource) {
        const uri = (URI.isUri(this.model) ? this.model : this.model.uri);
        return (uri.toString() === resource.toString());
    }
    setModel(model) {
        this.model = model;
    }
    canAppend(model) {
        return (this.model === model && this._data instanceof SingleModelEditStackData);
    }
    append(model, textChanges, afterEOL, afterVersionId, afterCursorState) {
        if (this._data instanceof SingleModelEditStackData) {
            this._data.append(model, textChanges, afterEOL, afterVersionId, afterCursorState);
        }
    }
    close() {
        if (this._data instanceof SingleModelEditStackData) {
            this._data = this._data.serialize();
        }
    }
    open() {
        if (!(this._data instanceof SingleModelEditStackData)) {
            this._data = SingleModelEditStackData.deserialize(this._data);
        }
    }
    undo() {
        if (URI.isUri(this.model)) {
            // don't have a model
            throw new Error(`Invalid SingleModelEditStackElement`);
        }
        if (this._data instanceof SingleModelEditStackData) {
            this._data = this._data.serialize();
        }
        const data = SingleModelEditStackData.deserialize(this._data);
        this.model._applyUndo(data.changes, data.beforeEOL, data.beforeVersionId, data.beforeCursorState);
    }
    redo() {
        if (URI.isUri(this.model)) {
            // don't have a model
            throw new Error(`Invalid SingleModelEditStackElement`);
        }
        if (this._data instanceof SingleModelEditStackData) {
            this._data = this._data.serialize();
        }
        const data = SingleModelEditStackData.deserialize(this._data);
        this.model._applyRedo(data.changes, data.afterEOL, data.afterVersionId, data.afterCursorState);
    }
    heapSize() {
        if (this._data instanceof SingleModelEditStackData) {
            this._data = this._data.serialize();
        }
        return this._data.byteLength + 168 /*heap overhead*/;
    }
}
export class MultiModelEditStackElement {
    get resources() {
        return this._editStackElementsArr.map(editStackElement => editStackElement.resource);
    }
    constructor(label, code, editStackElements) {
        this.label = label;
        this.code = code;
        this.type = 1 /* UndoRedoElementType.Workspace */;
        this._isOpen = true;
        this._editStackElementsArr = editStackElements.slice(0);
        this._editStackElementsMap = new Map();
        for (const editStackElement of this._editStackElementsArr) {
            const key = uriGetComparisonKey(editStackElement.resource);
            this._editStackElementsMap.set(key, editStackElement);
        }
        this._delegate = null;
    }
    setDelegate(delegate) {
        this._delegate = delegate;
    }
    prepareUndoRedo() {
        if (this._delegate) {
            return this._delegate.prepareUndoRedo(this);
        }
    }
    getMissingModels() {
        const result = [];
        for (const editStackElement of this._editStackElementsArr) {
            if (URI.isUri(editStackElement.model)) {
                result.push(editStackElement.model);
            }
        }
        return result;
    }
    matchesResource(resource) {
        const key = uriGetComparisonKey(resource);
        return (this._editStackElementsMap.has(key));
    }
    setModel(model) {
        const key = uriGetComparisonKey(URI.isUri(model) ? model : model.uri);
        if (this._editStackElementsMap.has(key)) {
            this._editStackElementsMap.get(key).setModel(model);
        }
    }
    canAppend(model) {
        if (!this._isOpen) {
            return false;
        }
        const key = uriGetComparisonKey(model.uri);
        if (this._editStackElementsMap.has(key)) {
            const editStackElement = this._editStackElementsMap.get(key);
            return editStackElement.canAppend(model);
        }
        return false;
    }
    append(model, textChanges, afterEOL, afterVersionId, afterCursorState) {
        const key = uriGetComparisonKey(model.uri);
        const editStackElement = this._editStackElementsMap.get(key);
        editStackElement.append(model, textChanges, afterEOL, afterVersionId, afterCursorState);
    }
    close() {
        this._isOpen = false;
    }
    open() {
        // cannot reopen
    }
    undo() {
        this._isOpen = false;
        for (const editStackElement of this._editStackElementsArr) {
            editStackElement.undo();
        }
    }
    redo() {
        for (const editStackElement of this._editStackElementsArr) {
            editStackElement.redo();
        }
    }
    heapSize(resource) {
        const key = uriGetComparisonKey(resource);
        if (this._editStackElementsMap.has(key)) {
            const editStackElement = this._editStackElementsMap.get(key);
            return editStackElement.heapSize();
        }
        return 0;
    }
    split() {
        return this._editStackElementsArr;
    }
    toString() {
        const result = [];
        for (const editStackElement of this._editStackElementsArr) {
            result.push(`${basename(editStackElement.resource)}: ${editStackElement}`);
        }
        return `{${result.join(', ')}}`;
    }
}
function getModelEOL(model) {
    const eol = model.getEOL();
    if (eol === '\n') {
        return 0 /* EndOfLineSequence.LF */;
    }
    else {
        return 1 /* EndOfLineSequence.CRLF */;
    }
}
export function isEditStackElement(element) {
    if (!element) {
        return false;
    }
    return ((element instanceof SingleModelEditStackElement) || (element instanceof MultiModelEditStackElement));
}
export class EditStack {
    constructor(model, undoRedoService) {
        this._model = model;
        this._undoRedoService = undoRedoService;
    }
    pushStackElement() {
        const lastElement = this._undoRedoService.getLastElement(this._model.uri);
        if (isEditStackElement(lastElement)) {
            lastElement.close();
        }
    }
    popStackElement() {
        const lastElement = this._undoRedoService.getLastElement(this._model.uri);
        if (isEditStackElement(lastElement)) {
            lastElement.open();
        }
    }
    clear() {
        this._undoRedoService.removeElements(this._model.uri);
    }
    _getOrCreateEditStackElement(beforeCursorState, group) {
        const lastElement = this._undoRedoService.getLastElement(this._model.uri);
        if (isEditStackElement(lastElement) && lastElement.canAppend(this._model)) {
            return lastElement;
        }
        const newElement = new SingleModelEditStackElement(nls.localize('edit', "Typing"), 'undoredo.textBufferEdit', this._model, beforeCursorState);
        this._undoRedoService.pushElement(newElement, group);
        return newElement;
    }
    pushEOL(eol) {
        const editStackElement = this._getOrCreateEditStackElement(null, undefined);
        this._model.setEOL(eol);
        editStackElement.append(this._model, [], getModelEOL(this._model), this._model.getAlternativeVersionId(), null);
    }
    pushEditOperation(beforeCursorState, editOperations, cursorStateComputer, group) {
        const editStackElement = this._getOrCreateEditStackElement(beforeCursorState, group);
        const inverseEditOperations = this._model.applyEdits(editOperations, true);
        const afterCursorState = EditStack._computeCursorState(cursorStateComputer, inverseEditOperations);
        const textChanges = inverseEditOperations.map((op, index) => ({ index: index, textChange: op.textChange }));
        textChanges.sort((a, b) => {
            if (a.textChange.oldPosition === b.textChange.oldPosition) {
                return a.index - b.index;
            }
            return a.textChange.oldPosition - b.textChange.oldPosition;
        });
        editStackElement.append(this._model, textChanges.map(op => op.textChange), getModelEOL(this._model), this._model.getAlternativeVersionId(), afterCursorState);
        return afterCursorState;
    }
    static _computeCursorState(cursorStateComputer, inverseEditOperations) {
        try {
            return cursorStateComputer ? cursorStateComputer(inverseEditOperations) : null;
        }
        catch (e) {
            onUnexpectedError(e);
            return null;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFN0YWNrLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvZWRpdFN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUM7QUFDdkMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBSWpELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsVUFBVSxFQUFFLDhCQUE4QixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDbkYsT0FBTyxLQUFLLE1BQU0sTUFBTSxnQ0FBZ0MsQ0FBQztBQUV6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFHN0QsU0FBUyxtQkFBbUIsQ0FBQyxRQUFhO0lBQ3pDLE9BQU8sUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQzVCLENBQUM7QUFFRCxNQUFNLE9BQU8sd0JBQXdCO0lBRTdCLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBaUIsRUFBRSxpQkFBcUM7UUFDNUUsTUFBTSxvQkFBb0IsR0FBRyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUM3RCxNQUFNLEdBQUcsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDL0IsT0FBTyxJQUFJLHdCQUF3QixDQUNsQyxvQkFBb0IsRUFDcEIsb0JBQW9CLEVBQ3BCLEdBQUcsRUFDSCxHQUFHLEVBQ0gsaUJBQWlCLEVBQ2pCLGlCQUFpQixFQUNqQixFQUFFLENBQ0YsQ0FBQztJQUNILENBQUM7SUFFRCxZQUNpQixlQUF1QixFQUNoQyxjQUFzQixF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