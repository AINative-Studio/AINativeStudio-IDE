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
var Disposable_1, Position_1, Range_1, Selection_1, TextEdit_1, NotebookEdit_1, SnippetString_1, Location_1, SymbolInformation_1, DocumentSymbol_1, CodeActionKind_1, MarkdownString_1, TaskGroup_1, Task_1, TreeItem_1, FileSystemError_1, TestMessage_1;
import { asArray, coalesceInPlace, equals } from '../../../base/common/arrays.js';
import { illegalArgument } from '../../../base/common/errors.js';
import { MarkdownString as BaseMarkdownString } from '../../../base/common/htmlContent.js';
import { ResourceMap } from '../../../base/common/map.js';
import { Mimes, normalizeMimeType } from '../../../base/common/mime.js';
import { nextCharLength } from '../../../base/common/strings.js';
import { isNumber, isObject, isString, isStringArray } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { FileSystemProviderErrorCode, markAsFileSystemProviderError } from '../../../platform/files/common/files.js';
import { RemoteAuthorityResolverErrorCode } from '../../../platform/remote/common/remoteAuthorityResolver.js';
import { isTextStreamMime } from '../../contrib/notebook/common/notebookCommon.js';
/**
 * @deprecated
 *
 * This utility ensures that old JS code that uses functions for classes still works. Existing usages cannot be removed
 * but new ones must not be added
 * */
function es5ClassCompat(target) {
    const interceptFunctions = {
        apply: function (...args) {
            if (args.length === 0) {
                return Reflect.construct(target, []);
            }
            else {
                const argsList = args.length === 1 ? [] : args[1];
                return Reflect.construct(target, argsList, args[0].constructor);
            }
        },
        call: function (...args) {
            if (args.length === 0) {
                return Reflect.construct(target, []);
            }
            else {
                const [thisArg, ...restArgs] = args;
                return Reflect.construct(target, restArgs, thisArg.constructor);
            }
        }
    };
    return Object.assign(target, interceptFunctions);
}
export var TerminalOutputAnchor;
(function (TerminalOutputAnchor) {
    TerminalOutputAnchor[TerminalOutputAnchor["Top"] = 0] = "Top";
    TerminalOutputAnchor[TerminalOutputAnchor["Bottom"] = 1] = "Bottom";
})(TerminalOutputAnchor || (TerminalOutputAnchor = {}));
export var TerminalQuickFixType;
(function (TerminalQuickFixType) {
    TerminalQuickFixType[TerminalQuickFixType["TerminalCommand"] = 0] = "TerminalCommand";
    TerminalQuickFixType[TerminalQuickFixType["Opener"] = 1] = "Opener";
    TerminalQuickFixType[TerminalQuickFixType["Command"] = 3] = "Command";
})(TerminalQuickFixType || (TerminalQuickFixType = {}));
let Disposable = Disposable_1 = class Disposable {
    static from(...inDisposables) {
        let disposables = inDisposables;
        return new Disposable_1(function () {
            if (disposables) {
                for (const disposable of disposables) {
                    if (disposable && typeof disposable.dispose === 'function') {
                        disposable.dispose();
                    }
                }
                disposables = undefined;
            }
        });
    }
    #callOnDispose;
    constructor(callOnDispose) {
        this.#callOnDispose = callOnDispose;
    }
    dispose() {
        if (typeof this.#callOnDispose === 'function') {
            this.#callOnDispose();
            this.#callOnDispose = undefined;
        }
    }
};
Disposable = Disposable_1 = __decorate([
    es5ClassCompat
], Disposable);
export { Disposable };
let Position = Position_1 = class Position {
    static Min(...positions) {
        if (positions.length === 0) {
            throw new TypeError();
        }
        let result = positions[0];
        for (let i = 1; i < positions.length; i++) {
            const p = positions[i];
            if (p.isBefore(result)) {
                result = p;
            }
        }
        return result;
    }
    static Max(...positions) {
        if (positions.length === 0) {
            throw new TypeError();
        }
        let result = positions[0];
        for (let i = 1; i < positions.length; i++) {
            const p = positions[i];
            if (p.isAfter(result)) {
                result = p;
            }
        }
        return result;
    }
    static isPosition(other) {
        if (!other) {
            return false;
        }
        if (other instanceof Position_1) {
            return true;
        }
        const { line, character } = other;
        if (typeof line === 'number' && typeof character === 'number') {
            return true;
        }
        return false;
    }
    static of(obj) {
        if (obj instanceof Position_1) {
            return obj;
        }
        else if (this.isPosition(obj)) {
            return new Position_1(obj.line, obj.character);
        }
        throw new Error('Invalid argument, is NOT a position-like object');
    }
    get line() {
        return this._line;
    }
    get character() {
        return this._character;
    }
    constructor(line, character) {
        if (line < 0) {
            throw illegalArgument('line must be non-negative');
        }
        if (character < 0) {
            throw illegalArgument('character must be non-negative');
        }
        this._line = line;
        this._character = character;
    }
    isBefore(other) {
        if (this._line < other._line) {
            return true;
        }
        if (other._line < this._line) {
            return false;
        }
        return this._character < other._character;
    }
    isBeforeOrEqual(other) {
        if (this._line < other._line) {
            return true;
        }
        if (other._line < this._line) {
            return false;
        }
        return this._character <= other._character;
    }
    isAfter(other) {
        return !this.isBeforeOrEqual(other);
    }
    isAfterOrEqual(other) {
        return !this.isBefore(other);
    }
    isEqual(other) {
        return this._line === other._line && this._character === other._character;
    }
    compareTo(other) {
        if (this._line < other._line) {
            return -1;
        }
        else if (this._line > other.line) {
            return 1;
        }
        else {
            // equal line
            if (this._character < other._character) {
                return -1;
            }
            else if (this._character > other._character) {
                return 1;
            }
            else {
                // equal line and character
                return 0;
            }
        }
    }
    translate(lineDeltaOrChange, characterDelta = 0) {
        if (lineDeltaOrChange === null || characterDelta === null) {
            throw illegalArgument();
        }
        let lineDelta;
        if (typeof lineDeltaOrChange === 'undefined') {
            lineDelta = 0;
        }
        else if (typeof lineDeltaOrChange === 'number') {
            lineDelta = lineDeltaOrChange;
        }
        else {
            lineDelta = typeof lineDeltaOrChange.lineDelta === 'number' ? lineDeltaOrChange.lineDelta : 0;
            characterDelta = typeof lineDeltaOrChange.characterDelta === 'number' ? lineDeltaOrChange.characterDelta : 0;
        }
        if (lineDelta === 0 && characterDelta === 0) {
            return this;
        }
        return new Position_1(this.line + lineDelta, this.character + characterDelta);
    }
    with(lineOrChange, character = this.character) {
        if (lineOrChange === null || character === null) {
            throw illegalArgument();
        }
        let line;
        if (typeof lineOrChange === 'undefined') {
            line = this.line;
        }
        else if (typeof lineOrChange === 'number') {
            line = lineOrChange;
        }
        else {
            line = typeof lineOrChange.line === 'number' ? lineOrChange.line : this.line;
            character = typeof lineOrChange.character === 'number' ? lineOrChange.character : this.character;
        }
        if (line === this.line && character === this.character) {
            return this;
        }
        return new Position_1(line, character);
    }
    toJSON() {
        return { line: this.line, character: this.character };
    }
    [Symbol.for('debug.description')]() {
        return `(${this.line}:${this.character})`;
    }
};
Position = Position_1 = __decorate([
    es5ClassCompat
], Position);
export { Position };
let Range = Range_1 = class Range {
    static isRange(thing) {
        if (thing instanceof Range_1) {
            return true;
        }
        if (!thing) {
            return false;
        }
        return Position.isPosition(thing.start)
            && Position.isPosition(thing.end);
    }
    static of(obj) {
        if (obj instanceof Range_1) {
            return obj;
        }
        if (this.isRange(obj)) {
            return new Range_1(obj.start, obj.end);
        }
        throw new Error('Invalid argument, is NOT a range-like object');
    }
    get start() {
        return this._start;
    }
    get end() {
        return this._end;
    }
    constructor(startLineOrStart, startColumnOrEnd, endLine, endColumn) {
        let start;
        let end;
        if (typeof startLineOrStart === 'number' && typeof startColumnOrEnd === 'number' && typeof endLine === 'number' && typeof endColumn === 'number') {
            start = new Position(startLineOrStart, startColumnOrEnd);
            end = new Position(endLine, endColumn);
        }
        else if (Position.isPosition(startLineOrStart) && Position.isPosition(startColumnOrEnd)) {
            start = Position.of(startLineOrStart);
            end = Position.of(startColumnOrEnd);
        }
        if (!start || !end) {
            throw new Error('Invalid arguments');
        }
        if (start.isBefore(end)) {
            this._start = start;
            this._end = end;
        }
        else {
            this._start = end;
            this._end = start;
        }
    }
    contains(positionOrRange) {
        if (Range_1.isRange(positionOrRange)) {
            return this.contains(positionOrRange.start)
                && this.contains(positionOrRange.end);
        }
        else if (Position.isPosition(positionOrRange)) {
            if (Position.of(positionOrRange).isBefore(this._start)) {
                return false;
            }
            if (this._end.isBefore(positionOrRange)) {
                return false;
            }
            return true;
        }
        return false;
    }
    isEqual(other) {
        return this._start.isEqual(other._start) && this._end.isEqual(other._end);
    }
    intersection(other) {
        const start = Position.Max(other.start, this._start);
        const end = Position.Min(other.end, this._end);
        if (start.isAfter(end)) {
            // this happens when there is no overlap:
            // |-----|
            //          |----|
            return undefined;
        }
        return new Range_1(start, end);
    }
    union(other) {
        if (this.contains(other)) {
            return this;
        }
        else if (other.contains(this)) {
            return other;
        }
        const start = Position.Min(other.start, this._start);
        const end = Position.Max(other.end, this.end);
        return new Range_1(start, end);
    }
    get isEmpty() {
        return this._start.isEqual(this._end);
    }
    get isSingleLine() {
        return this._start.line === this._end.line;
    }
    with(startOrChange, end = this.end) {
        if (startOrChange === null || end === null) {
            throw illegalArgument();
        }
        let start;
        if (!startOrChange) {
            start = this.start;
        }
        else if (Position.isPosition(startOrChange)) {
            start = startOrChange;
        }
        else {
            start = startOrChange.start || this.start;
            end = startOrChange.end || this.end;
        }
        if (start.isEqual(this._start) && end.isEqual(this.end)) {
            return this;
        }
        return new Range_1(start, end);
    }
    toJSON() {
        return [this.start, this.end];
    }
    [Symbol.for('debug.description')]() {
        return getDebugDescriptionOfRange(this);
    }
};
Range = Range_1 = __decorate([
    es5ClassCompat
], Range);
export { Range };
let Selection = Selection_1 = class Selection extends Range {
    static isSelection(thing) {
        if (thing instanceof Selection_1) {
            return true;
        }
        if (!thing) {
            return false;
        }
        return Range.isRange(thing)
            && Position.isPosition(thing.anchor)
            && Position.isPosition(thing.active)
            && typeof thing.isReversed === 'boolean';
    }
    get anchor() {
        return this._anchor;
    }
    get active() {
        return this._active;
    }
    constructor(anchorLineOrAnchor, anchorColumnOrActive, activeLine, activeColumn) {
        let anchor;
        let active;
        if (typeof anchorLineOrAnchor === 'number' && typeof anchorColumnOrActive === 'number' && typeof activeLine === 'number' && typeof activeColumn === 'number') {
            anchor = new Position(anchorLineOrAnchor, anchorColumnOrActive);
            active = new Position(activeLine, activeColumn);
        }
        else if (Position.isPosition(anchorLineOrAnchor) && Position.isPosition(anchorColumnOrActive)) {
            anchor = Position.of(anchorLineOrAnchor);
            active = Position.of(anchorColumnOrActive);
        }
        if (!anchor || !active) {
            throw new Error('Invalid arguments');
        }
        super(anchor, active);
        this._anchor = anchor;
        this._active = active;
    }
    get isReversed() {
        return this._anchor === this._end;
    }
    toJSON() {
        return {
            start: this.start,
            end: this.end,
            active: this.active,
            anchor: this.anchor
        };
    }
    [Symbol.for('debug.description')]() {
        return getDebugDescriptionOfSelection(this);
    }
};
Selection = Selection_1 = __decorate([
    es5ClassCompat
], Selection);
export { Selection };
export function getDebugDescriptionOfRange(range) {
    return range.isEmpty
        ? `[${range.start.line}:${range.start.character})`
        : `[${range.start.line}:${range.start.character} -> ${range.end.line}:${range.end.character})`;
}
export function getDebugDescriptionOfSelection(selection) {
    let rangeStr = getDebugDescriptionOfRange(selection);
    if (!selection.isEmpty) {
        if (selection.active.isEqual(selection.start)) {
            rangeStr = `|${rangeStr}`;
        }
        else {
            rangeStr = `${rangeStr}|`;
        }
    }
    return rangeStr;
}
const validateConnectionToken = (connectionToken) => {
    if (typeof connectionToken !== 'string' || connectionToken.length === 0 || !/^[0-9A-Za-z_\-]+$/.test(connectionToken)) {
        throw illegalArgument('connectionToken');
    }
};
export class ResolvedAuthority {
    static isResolvedAuthority(resolvedAuthority) {
        return resolvedAuthority
            && typeof resolvedAuthority === 'object'
            && typeof resolvedAuthority.host === 'string'
            && typeof resolvedAuthority.port === 'number'
            && (resolvedAuthority.connectionToken === undefined || typeof resolvedAuthority.connectionToken === 'string');
    }
    constructor(host, port, connectionToken) {
        if (typeof host !== 'string' || host.length === 0) {
            throw illegalArgument('host');
        }
        if (typeof port !== 'number' || port === 0 || Math.round(port) !== port) {
            throw illegalArgument('port');
        }
        if (typeof connectionToken !== 'undefined') {
            validateConnectionToken(connectionToken);
        }
        this.host = host;
        this.port = Math.round(port);
        this.connectionToken = connectionToken;
    }
}
export class ManagedResolvedAuthority {
    static isManagedResolvedAuthority(resolvedAuthority) {
        return resolvedAuthority
            && typeof resolvedAuthority === 'object'
            && typeof resolvedAuthority.makeConnection === 'function'
            && (resolvedAuthority.connectionToken === undefined || typeof resolvedAuthority.connectionToken === 'string');
    }
    constructor(makeConnection, connectionToken) {
        this.makeConnection = makeConnection;
        this.connectionToken = connectionToken;
        if (typeof connectionToken !== 'undefined') {
            validateConnectionToken(connectionToken);
        }
    }
}
export class RemoteAuthorityResolverError extends Error {
    static NotAvailable(message, handled) {
        return new RemoteAuthorityResolverError(message, RemoteAuthorityResolverErrorCode.NotAvailable, handled);
    }
    static TemporarilyNotAvailable(message) {
        return new RemoteAuthorityResolverError(message, RemoteAuthorityResolverErrorCode.TemporarilyNotAvailable);
    }
    constructor(message, code = RemoteAuthorityResolverErrorCode.Unknown, detail) {
        super(message);
        this._message = message;
        this._code = code;
        this._detail = detail;
        // workaround when extending builtin objects and when compiling to ES5, see:
        // https://github.com/microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(this, RemoteAuthorityResolverError.prototype);
    }
}
export var EndOfLine;
(function (EndOfLine) {
    EndOfLine[EndOfLine["LF"] = 1] = "LF";
    EndOfLine[EndOfLine["CRLF"] = 2] = "CRLF";
})(EndOfLine || (EndOfLine = {}));
export var EnvironmentVariableMutatorType;
(function (EnvironmentVariableMutatorType) {
    EnvironmentVariableMutatorType[EnvironmentVariableMutatorType["Replace"] = 1] = "Replace";
    EnvironmentVariableMutatorType[EnvironmentVariableMutatorType["Append"] = 2] = "Append";
    EnvironmentVariableMutatorType[EnvironmentVariableMutatorType["Prepend"] = 3] = "Prepend";
})(EnvironmentVariableMutatorType || (EnvironmentVariableMutatorType = {}));
let TextEdit = TextEdit_1 = class TextEdit {
    static isTextEdit(thing) {
        if (thing instanceof TextEdit_1) {
            return true;
        }
        if (!thing) {
            return false;
        }
        return Range.isRange(thing)
            && typeof thing.newText === 'string';
    }
    static replace(range, newText) {
        return new TextEdit_1(range, newText);
    }
    static insert(position, newText) {
        return TextEdit_1.replace(new Range(position, position), newText);
    }
    static delete(range) {
        return TextEdit_1.replace(range, '');
    }
    static setEndOfLine(eol) {
        const ret = new TextEdit_1(new Range(new Position(0, 0), new Position(0, 0)), '');
        ret.newEol = eol;
        return ret;
    }
    get range() {
        return this._range;
    }
    set range(value) {
        if (value && !Range.isRange(value)) {
            throw illegalArgument('range');
        }
        this._range = value;
    }
    get newText() {
        return this._newText || '';
    }
    set newText(value) {
        if (value && typeof value !== 'string') {
            throw illegalArgument('newText');
        }
        this._newText = value;
    }
    get newEol() {
        return this._newEol;
    }
    set newEol(value) {
        if (value && typeof value !== 'number') {
            throw illegalArgument('newEol');
        }
        this._newEol = value;
    }
    constructor(range, newText) {
        this._range = range;
        this._newText = newText;
    }
    toJSON() {
        return {
            range: this.range,
            newText: this.newText,
            newEol: this._newEol
        };
    }
};
TextEdit = TextEdit_1 = __decorate([
    es5ClassCompat
], TextEdit);
export { TextEdit };
let NotebookEdit = NotebookEdit_1 = class NotebookEdit {
    static isNotebookCellEdit(thing) {
        if (thing instanceof NotebookEdit_1) {
            return true;
        }
        if (!thing) {
            return false;
        }
        return NotebookRange.isNotebookRange(thing)
            && Array.isArray(thing.newCells);
    }
    static replaceCells(range, newCells) {
        return new NotebookEdit_1(range, newCells);
    }
    static insertCells(index, newCells) {
        return new NotebookEdit_1(new NotebookRange(index, index), newCells);
    }
    static deleteCells(range) {
        return new NotebookEdit_1(range, []);
    }
    static updateCellMetadata(index, newMetadata) {
        const edit = new NotebookEdit_1(new NotebookRange(index, index), []);
        edit.newCellMetadata = newMetadata;
        return edit;
    }
    static updateNotebookMetadata(newMetadata) {
        const edit = new NotebookEdit_1(new NotebookRange(0, 0), []);
        edit.newNotebookMetadata = newMetadata;
        return edit;
    }
    constructor(range, newCells) {
        this.range = range;
        this.newCells = newCells;
    }
};
NotebookEdit = NotebookEdit_1 = __decorate([
    es5ClassCompat
], NotebookEdit);
export { NotebookEdit };
export class SnippetTextEdit {
    static isSnippetTextEdit(thing) {
        if (thing instanceof SnippetTextEdit) {
            return true;
        }
        if (!thing) {
            return false;
        }
        return Range.isRange(thing.range)
            && SnippetString.isSnippetString(thing.snippet);
    }
    static replace(range, snippet) {
        return new SnippetTextEdit(range, snippet);
    }
    static insert(position, snippet) {
        return SnippetTextEdit.replace(new Range(position, position), snippet);
    }
    constructor(range, snippet) {
        this.range = range;
        this.snippet = snippet;
    }
}
export var FileEditType;
(function (FileEditType) {
    FileEditType[FileEditType["File"] = 1] = "File";
    FileEditType[FileEditType["Text"] = 2] = "Text";
    FileEditType[FileEditType["Cell"] = 3] = "Cell";
    FileEditType[FileEditType["CellReplace"] = 5] = "CellReplace";
    FileEditType[FileEditType["Snippet"] = 6] = "Snippet";
})(FileEditType || (FileEditType = {}));
let WorkspaceEdit = class WorkspaceEdit {
    constructor() {
        this._edits = [];
    }
    _allEntries() {
        return this._edits;
    }
    // --- file
    renameFile(from, to, options, metadata) {
        this._edits.push({ _type: 1 /* FileEditType.File */, from, to, options, metadata });
    }
    createFile(uri, options, metadata) {
        this._edits.push({ _type: 1 /* FileEditType.File */, from: undefined, to: uri, options, metadata });
    }
    deleteFile(uri, options, metadata) {
        this._edits.push({ _type: 1 /* FileEditType.File */, from: uri, to: undefined, options, metadata });
    }
    // --- notebook
    replaceNotebookMetadata(uri, value, metadata) {
        this._edits.push({ _type: 3 /* FileEditType.Cell */, metadata, uri, edit: { editType: 5 /* CellEditType.DocumentMetadata */, metadata: value } });
    }
    replaceNotebookCells(uri, startOrRange, cellData, metadata) {
        const start = startOrRange.start;
        const end = startOrRange.end;
        if (start !== end || cellData.length > 0) {
            this._edits.push({ _type: 5 /* FileEditType.CellReplace */, uri, index: start, count: end - start, cells: cellData, metadata });
        }
    }
    replaceNotebookCellMetadata(uri, index, cellMetadata, metadata) {
        this._edits.push({ _type: 3 /* FileEditType.Cell */, metadata, uri, edit: { editType: 3 /* CellEditType.Metadata */, index, metadata: cellMetadata } });
    }
    // --- text
    replace(uri, range, newText, metadata) {
        this._edits.push({ _type: 2 /* FileEditType.Text */, uri, edit: new TextEdit(range, newText), metadata });
    }
    insert(resource, position, newText, metadata) {
        this.replace(resource, new Range(position, position), newText, metadata);
    }
    delete(resource, range, metadata) {
        this.replace(resource, range, '', metadata);
    }
    // --- text (Maplike)
    has(uri) {
        return this._edits.some(edit => edit._type === 2 /* FileEditType.Text */ && edit.uri.toString() === uri.toString());
    }
    set(uri, edits) {
        if (!edits) {
            // remove all text, snippet, or notebook edits for `uri`
            for (let i = 0; i < this._edits.length; i++) {
                const element = this._edits[i];
                switch (element._type) {
                    case 2 /* FileEditType.Text */:
                    case 6 /* FileEditType.Snippet */:
                    case 3 /* FileEditType.Cell */:
                    case 5 /* FileEditType.CellReplace */:
                        if (element.uri.toString() === uri.toString()) {
                            this._edits[i] = undefined; // will be coalesced down below
                        }
                        break;
                }
            }
            coalesceInPlace(this._edits);
        }
        else {
            // append edit to the end
            for (const editOrTuple of edits) {
                if (!editOrTuple) {
                    continue;
                }
                let edit;
                let metadata;
                if (Array.isArray(editOrTuple)) {
                    edit = editOrTuple[0];
                    metadata = editOrTuple[1];
                }
                else {
                    edit = editOrTuple;
                }
                if (NotebookEdit.isNotebookCellEdit(edit)) {
                    if (edit.newCellMetadata) {
                        this.replaceNotebookCellMetadata(uri, edit.range.start, edit.newCellMetadata, metadata);
                    }
                    else if (edit.newNotebookMetadata) {
                        this.replaceNotebookMetadata(uri, edit.newNotebookMetadata, metadata);
                    }
                    else {
                        this.replaceNotebookCells(uri, edit.range, edit.newCells, metadata);
                    }
                }
                else if (SnippetTextEdit.isSnippetTextEdit(edit)) {
                    this._edits.push({ _type: 6 /* FileEditType.Snippet */, uri, range: edit.range, edit: edit.snippet, metadata, keepWhitespace: edit.keepWhitespace });
                }
                else {
                    this._edits.push({ _type: 2 /* FileEditType.Text */, uri, edit, metadata });
                }
            }
        }
    }
    get(uri) {
        const res = [];
        for (const candidate of this._edits) {
            if (candidate._type === 2 /* FileEditType.Text */ && candidate.uri.toString() === uri.toString()) {
                res.push(candidate.edit);
            }
        }
        return res;
    }
    entries() {
        const textEdits = new ResourceMap();
        for (const candidate of this._edits) {
            if (candidate._type === 2 /* FileEditType.Text */) {
                let textEdit = textEdits.get(candidate.uri);
                if (!textEdit) {
                    textEdit = [candidate.uri, []];
                    textEdits.set(candidate.uri, textEdit);
                }
                textEdit[1].push(candidate.edit);
            }
        }
        return [...textEdits.values()];
    }
    get size() {
        return this.entries().length;
    }
    toJSON() {
        return this.entries();
    }
};
WorkspaceEdit = __decorate([
    es5ClassCompat
], WorkspaceEdit);
export { WorkspaceEdit };
let SnippetString = SnippetString_1 = class SnippetString {
    static isSnippetString(thing) {
        if (thing instanceof SnippetString_1) {
            return true;
        }
        if (!thing) {
            return false;
        }
        return typeof thing.value === 'string';
    }
    static _escape(value) {
        return value.replace(/\$|}|\\/g, '\\$&');
    }
    constructor(value) {
        this._tabstop = 1;
        this.value = value || '';
    }
    appendText(string) {
        this.value += SnippetString_1._escape(string);
        return this;
    }
    appendTabstop(number = this._tabstop++) {
        this.value += '$';
        this.value += number;
        return this;
    }
    appendPlaceholder(value, number = this._tabstop++) {
        if (typeof value === 'function') {
            const nested = new SnippetString_1();
            nested._tabstop = this._tabstop;
            value(nested);
            this._tabstop = nested._tabstop;
            value = nested.value;
        }
        else {
            value = SnippetString_1._escape(value);
        }
        this.value += '${';
        this.value += number;
        this.value += ':';
        this.value += value;
        this.value += '}';
        return this;
    }
    appendChoice(values, number = this._tabstop++) {
        const value = values.map(s => s.replaceAll(/[|\\,]/g, '\\$&')).join(',');
        this.value += '${';
        this.value += number;
        this.value += '|';
        this.value += value;
        this.value += '|}';
        return this;
    }
    appendVariable(name, defaultValue) {
        if (typeof defaultValue === 'function') {
            const nested = new SnippetString_1();
            nested._tabstop = this._tabstop;
            defaultValue(nested);
            this._tabstop = nested._tabstop;
            defaultValue = nested.value;
        }
        else if (typeof defaultValue === 'string') {
            defaultValue = defaultValue.replace(/\$|}/g, '\\$&'); // CodeQL [SM02383] I do not want to escape backslashes here
        }
        this.value += '${';
        this.value += name;
        if (defaultValue) {
            this.value += ':';
            this.value += defaultValue;
        }
        this.value += '}';
        return this;
    }
};
SnippetString = SnippetString_1 = __decorate([
    es5ClassCompat
], SnippetString);
export { SnippetString };
export var DiagnosticTag;
(function (DiagnosticTag) {
    DiagnosticTag[DiagnosticTag["Unnecessary"] = 1] = "Unnecessary";
    DiagnosticTag[DiagnosticTag["Deprecated"] = 2] = "Deprecated";
})(DiagnosticTag || (DiagnosticTag = {}));
export var DiagnosticSeverity;
(function (DiagnosticSeverity) {
    DiagnosticSeverity[DiagnosticSeverity["Hint"] = 3] = "Hint";
    DiagnosticSeverity[DiagnosticSeverity["Information"] = 2] = "Information";
    DiagnosticSeverity[DiagnosticSeverity["Warning"] = 1] = "Warning";
    DiagnosticSeverity[DiagnosticSeverity["Error"] = 0] = "Error";
})(DiagnosticSeverity || (DiagnosticSeverity = {}));
let Location = Location_1 = class Location {
    static isLocation(thing) {
        if (thing instanceof Location_1) {
            return true;
        }
        if (!thing) {
            return false;
        }
        return Range.isRange(thing.range)
            && URI.isUri(thing.uri);
    }
    constructor(uri, rangeOrPosition) {
        this.uri = uri;
        if (!rangeOrPosition) {
            //that's OK
        }
        else if (Range.isRange(rangeOrPosition)) {
            this.range = Range.of(rangeOrPosition);
        }
        else if (Position.isPosition(rangeOrPosition)) {
            this.range = new Range(rangeOrPosition, rangeOrPosition);
        }
        else {
            throw new Error('Illegal argument');
        }
    }
    toJSON() {
        return {
            uri: this.uri,
            range: this.range
        };
    }
};
Location = Location_1 = __decorate([
    es5ClassCompat
], Location);
export { Location };
let DiagnosticRelatedInformation = class DiagnosticRelatedInformation {
    static is(thing) {
        if (!thing) {
            return false;
        }
        return typeof thing.message === 'string'
            && thing.location
            && Range.isRange(thing.location.range)
            && URI.isUri(thing.location.uri);
    }
    constructor(location, message) {
        this.location = location;
        this.message = message;
    }
    static isEqual(a, b) {
        if (a === b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }
        return a.message === b.message
            && a.location.range.isEqual(b.location.range)
            && a.location.uri.toString() === b.location.uri.toString();
    }
};
DiagnosticRelatedInformation = __decorate([
    es5ClassCompat
], DiagnosticRelatedInformation);
export { DiagnosticRelatedInformation };
let Diagnostic = class Diagnostic {
    constructor(range, message, severity = DiagnosticSeverity.Error) {
        if (!Range.isRange(range)) {
            throw new TypeError('range must be set');
        }
        if (!message) {
            throw new TypeError('message must be set');
        }
        this.range = range;
        this.message = message;
        this.severity = severity;
    }
    toJSON() {
        return {
            severity: DiagnosticSeverity[this.severity],
            message: this.message,
            range: this.range,
            source: this.source,
            code: this.code,
        };
    }
    static isEqual(a, b) {
        if (a === b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }
        return a.message === b.message
            && a.severity === b.severity
            && a.code === b.code
            && a.severity === b.severity
            && a.source === b.source
            && a.range.isEqual(b.range)
            && equals(a.tags, b.tags)
            && equals(a.relatedInformation, b.relatedInformation, DiagnosticRelatedInformation.isEqual);
    }
};
Diagnostic = __decorate([
    es5ClassCompat
], Diagnostic);
export { Diagnostic };
let Hover = class Hover {
    constructor(contents, range) {
        if (!contents) {
            throw new Error('Illegal argument, contents must be defined');
        }
        if (Array.isArray(contents)) {
            this.contents = contents;
        }
        else {
            this.contents = [contents];
        }
        this.range = range;
    }
};
Hover = __decorate([
    es5ClassCompat
], Hover);
export { Hover };
let VerboseHover = class VerboseHover extends Hover {
    constructor(contents, range, canIncreaseVerbosity, canDecreaseVerbosity) {
        super(contents, range);
        this.canIncreaseVerbosity = canIncreaseVerbosity;
        this.canDecreaseVerbosity = canDecreaseVerbosity;
    }
};
VerboseHover = __decorate([
    es5ClassCompat
], VerboseHover);
export { VerboseHover };
export var HoverVerbosityAction;
(function (HoverVerbosityAction) {
    HoverVerbosityAction[HoverVerbosityAction["Increase"] = 0] = "Increase";
    HoverVerbosityAction[HoverVerbosityAction["Decrease"] = 1] = "Decrease";
})(HoverVerbosityAction || (HoverVerbosityAction = {}));
export var DocumentHighlightKind;
(function (DocumentHighlightKind) {
    DocumentHighlightKind[DocumentHighlightKind["Text"] = 0] = "Text";
    DocumentHighlightKind[DocumentHighlightKind["Read"] = 1] = "Read";
    DocumentHighlightKind[DocumentHighlightKind["Write"] = 2] = "Write";
})(DocumentHighlightKind || (DocumentHighlightKind = {}));
let DocumentHighlight = class DocumentHighlight {
    constructor(range, kind = DocumentHighlightKind.Text) {
        this.range = range;
        this.kind = kind;
    }
    toJSON() {
        return {
            range: this.range,
            kind: DocumentHighlightKind[this.kind]
        };
    }
};
DocumentHighlight = __decorate([
    es5ClassCompat
], DocumentHighlight);
export { DocumentHighlight };
let MultiDocumentHighlight = class MultiDocumentHighlight {
    constructor(uri, highlights) {
        this.uri = uri;
        this.highlights = highlights;
    }
    toJSON() {
        return {
            uri: this.uri,
            highlights: this.highlights.map(h => h.toJSON())
        };
    }
};
MultiDocumentHighlight = __decorate([
    es5ClassCompat
], MultiDocumentHighlight);
export { MultiDocumentHighlight };
export var SymbolKind;
(function (SymbolKind) {
    SymbolKind[SymbolKind["File"] = 0] = "File";
    SymbolKind[SymbolKind["Module"] = 1] = "Module";
    SymbolKind[SymbolKind["Namespace"] = 2] = "Namespace";
    SymbolKind[SymbolKind["Package"] = 3] = "Package";
    SymbolKind[SymbolKind["Class"] = 4] = "Class";
    SymbolKind[SymbolKind["Method"] = 5] = "Method";
    SymbolKind[SymbolKind["Property"] = 6] = "Property";
    SymbolKind[SymbolKind["Field"] = 7] = "Field";
    SymbolKind[SymbolKind["Constructor"] = 8] = "Constructor";
    SymbolKind[SymbolKind["Enum"] = 9] = "Enum";
    SymbolKind[SymbolKind["Interface"] = 10] = "Interface";
    SymbolKind[SymbolKind["Function"] = 11] = "Function";
    SymbolKind[SymbolKind["Variable"] = 12] = "Variable";
    SymbolKind[SymbolKind["Constant"] = 13] = "Constant";
    SymbolKind[SymbolKind["String"] = 14] = "String";
    SymbolKind[SymbolKind["Number"] = 15] = "Number";
    SymbolKind[SymbolKind["Boolean"] = 16] = "Boolean";
    SymbolKind[SymbolKind["Array"] = 17] = "Array";
    SymbolKind[SymbolKind["Object"] = 18] = "Object";
    SymbolKind[SymbolKind["Key"] = 19] = "Key";
    SymbolKind[SymbolKind["Null"] = 20] = "Null";
    SymbolKind[SymbolKind["EnumMember"] = 21] = "EnumMember";
    SymbolKind[SymbolKind["Struct"] = 22] = "Struct";
    SymbolKind[SymbolKind["Event"] = 23] = "Event";
    SymbolKind[SymbolKind["Operator"] = 24] = "Operator";
    SymbolKind[SymbolKind["TypeParameter"] = 25] = "TypeParameter";
})(SymbolKind || (SymbolKind = {}));
export var SymbolTag;
(function (SymbolTag) {
    SymbolTag[SymbolTag["Deprecated"] = 1] = "Deprecated";
})(SymbolTag || (SymbolTag = {}));
let SymbolInformation = SymbolInformation_1 = class SymbolInformation {
    static validate(candidate) {
        if (!candidate.name) {
            throw new Error('name must not be falsy');
        }
    }
    constructor(name, kind, rangeOrContainer, locationOrUri, containerName) {
        this.name = name;
        this.kind = kind;
        this.containerName = containerName;
        if (typeof rangeOrContainer === 'string') {
            this.containerName = rangeOrContainer;
        }
        if (locationOrUri instanceof Location) {
            this.location = locationOrUri;
        }
        else if (rangeOrContainer instanceof Range) {
            this.location = new Location(locationOrUri, rangeOrContainer);
        }
        SymbolInformation_1.validate(this);
    }
    toJSON() {
        return {
            name: this.name,
            kind: SymbolKind[this.kind],
            location: this.location,
            containerName: this.containerName
        };
    }
};
SymbolInformation = SymbolInformation_1 = __decorate([
    es5ClassCompat
], SymbolInformation);
export { SymbolInformation };
let DocumentSymbol = DocumentSymbol_1 = class DocumentSymbol {
    static validate(candidate) {
        if (!candidate.name) {
            throw new Error('name must not be falsy');
        }
        if (!candidate.range.contains(candidate.selectionRange)) {
            throw new Error('selectionRange must be contained in fullRange');
        }
        candidate.children?.forEach(DocumentSymbol_1.validate);
    }
    constructor(name, detail, kind, range, selectionRange) {
        this.name = name;
        this.detail = detail;
        this.kind = kind;
        this.range = range;
        this.selectionRange = selectionRange;
        this.children = [];
        DocumentSymbol_1.validate(this);
    }
};
DocumentSymbol = DocumentSymbol_1 = __decorate([
    es5ClassCompat
], DocumentSymbol);
export { DocumentSymbol };
export var CodeActionTriggerKind;
(function (CodeActionTriggerKind) {
    CodeActionTriggerKind[CodeActionTriggerKind["Invoke"] = 1] = "Invoke";
    CodeActionTriggerKind[CodeActionTriggerKind["Automatic"] = 2] = "Automatic";
})(CodeActionTriggerKind || (CodeActionTriggerKind = {}));
let CodeAction = class CodeAction {
    constructor(title, kind) {
        this.title = title;
        this.kind = kind;
    }
};
CodeAction = __decorate([
    es5ClassCompat
], CodeAction);
export { CodeAction };
let CodeActionKind = class CodeActionKind {
    static { CodeActionKind_1 = this; }
    static { this.sep = '.'; }
    constructor(value) {
        this.value = value;
    }
    append(parts) {
        return new CodeActionKind_1(this.value ? this.value + CodeActionKind_1.sep + parts : parts);
    }
    intersects(other) {
        return this.contains(other) || other.contains(this);
    }
    contains(other) {
        return this.value === other.value || other.value.startsWith(this.value + CodeActionKind_1.sep);
    }
};
CodeActionKind = CodeActionKind_1 = __decorate([
    es5ClassCompat
], CodeActionKind);
export { CodeActionKind };
CodeActionKind.Empty = new CodeActionKind('');
CodeActionKind.QuickFix = CodeActionKind.Empty.append('quickfix');
CodeActionKind.Refactor = CodeActionKind.Empty.append('refactor');
CodeActionKind.RefactorExtract = CodeActionKind.Refactor.append('extract');
CodeActionKind.RefactorInline = CodeActionKind.Refactor.append('inline');
CodeActionKind.RefactorMove = CodeActionKind.Refactor.append('move');
CodeActionKind.RefactorRewrite = CodeActionKind.Refactor.append('rewrite');
CodeActionKind.Source = CodeActionKind.Empty.append('source');
CodeActionKind.SourceOrganizeImports = CodeActionKind.Source.append('organizeImports');
CodeActionKind.SourceFixAll = CodeActionKind.Source.append('fixAll');
CodeActionKind.Notebook = CodeActionKind.Empty.append('notebook');
let SelectionRange = class SelectionRange {
    constructor(range, parent) {
        this.range = range;
        this.parent = parent;
        if (parent && !parent.range.contains(this.range)) {
            throw new Error('Invalid argument: parent must contain this range');
        }
    }
};
SelectionRange = __decorate([
    es5ClassCompat
], SelectionRange);
export { SelectionRange };
export class CallHierarchyItem {
    constructor(kind, name, detail, uri, range, selectionRange) {
        this.kind = kind;
        this.name = name;
        this.detail = detail;
        this.uri = uri;
        this.range = range;
        this.selectionRange = selectionRange;
    }
}
export class CallHierarchyIncomingCall {
    constructor(item, fromRanges) {
        this.fromRanges = fromRanges;
        this.from = item;
    }
}
export class CallHierarchyOutgoingCall {
    constructor(item, fromRanges) {
        this.fromRanges = fromRanges;
        this.to = item;
    }
}
export var LanguageStatusSeverity;
(function (LanguageStatusSeverity) {
    LanguageStatusSeverity[LanguageStatusSeverity["Information"] = 0] = "Information";
    LanguageStatusSeverity[LanguageStatusSeverity["Warning"] = 1] = "Warning";
    LanguageStatusSeverity[LanguageStatusSeverity["Error"] = 2] = "Error";
})(LanguageStatusSeverity || (LanguageStatusSeverity = {}));
let CodeLens = class CodeLens {
    constructor(range, command) {
        this.range = range;
        this.command = command;
    }
    get isResolved() {
        return !!this.command;
    }
};
CodeLens = __decorate([
    es5ClassCompat
], CodeLens);
export { CodeLens };
let MarkdownString = MarkdownString_1 = class MarkdownString {
    #delegate;
    static isMarkdownString(thing) {
        if (thing instanceof MarkdownString_1) {
            return true;
        }
        return thing && thing.appendCodeblock && thing.appendMarkdown && thing.appendText && (thing.value !== undefined);
    }
    constructor(value, supportThemeIcons = false) {
        this.#delegate = new BaseMarkdownString(value, { supportThemeIcons });
    }
    get value() {
        return this.#delegate.value;
    }
    set value(value) {
        this.#delegate.value = value;
    }
    get isTrusted() {
        return this.#delegate.isTrusted;
    }
    set isTrusted(value) {
        this.#delegate.isTrusted = value;
    }
    get supportThemeIcons() {
        return this.#delegate.supportThemeIcons;
    }
    set supportThemeIcons(value) {
        this.#delegate.supportThemeIcons = value;
    }
    get supportHtml() {
        return this.#delegate.supportHtml;
    }
    set supportHtml(value) {
        this.#delegate.supportHtml = value;
    }
    get baseUri() {
        return this.#delegate.baseUri;
    }
    set baseUri(value) {
        this.#delegate.baseUri = value;
    }
    appendText(value) {
        this.#delegate.appendText(value);
        return this;
    }
    appendMarkdown(value) {
        this.#delegate.appendMarkdown(value);
        return this;
    }
    appendCodeblock(value, language) {
        this.#delegate.appendCodeblock(language ?? '', value);
        return this;
    }
};
MarkdownString = MarkdownString_1 = __decorate([
    es5ClassCompat
], MarkdownString);
export { MarkdownString };
let ParameterInformation = class ParameterInformation {
    constructor(label, documentation) {
        this.label = label;
        this.documentation = documentation;
    }
};
ParameterInformation = __decorate([
    es5ClassCompat
], ParameterInformation);
export { ParameterInformation };
let SignatureInformation = class SignatureInformation {
    constructor(label, documentation) {
        this.label = label;
        this.documentation = documentation;
        this.parameters = [];
    }
};
SignatureInformation = __decorate([
    es5ClassCompat
], SignatureInformation);
export { SignatureInformation };
let SignatureHelp = class SignatureHelp {
    constructor() {
        this.activeSignature = 0;
        this.activeParameter = 0;
        this.signatures = [];
    }
};
SignatureHelp = __decorate([
    es5ClassCompat
], SignatureHelp);
export { SignatureHelp };
export var SignatureHelpTriggerKind;
(function (SignatureHelpTriggerKind) {
    SignatureHelpTriggerKind[SignatureHelpTriggerKind["Invoke"] = 1] = "Invoke";
    SignatureHelpTriggerKind[SignatureHelpTriggerKind["TriggerCharacter"] = 2] = "TriggerCharacter";
    SignatureHelpTriggerKind[SignatureHelpTriggerKind["ContentChange"] = 3] = "ContentChange";
})(SignatureHelpTriggerKind || (SignatureHelpTriggerKind = {}));
export var InlayHintKind;
(function (InlayHintKind) {
    InlayHintKind[InlayHintKind["Type"] = 1] = "Type";
    InlayHintKind[InlayHintKind["Parameter"] = 2] = "Parameter";
})(InlayHintKind || (InlayHintKind = {}));
let InlayHintLabelPart = class InlayHintLabelPart {
    constructor(value) {
        this.value = value;
    }
};
InlayHintLabelPart = __decorate([
    es5ClassCompat
], InlayHintLabelPart);
export { InlayHintLabelPart };
let InlayHint = class InlayHint {
    constructor(position, label, kind) {
        this.position = position;
        this.label = label;
        this.kind = kind;
    }
};
InlayHint = __decorate([
    es5ClassCompat
], InlayHint);
export { InlayHint };
export var CompletionTriggerKind;
(function (CompletionTriggerKind) {
    CompletionTriggerKind[CompletionTriggerKind["Invoke"] = 0] = "Invoke";
    CompletionTriggerKind[CompletionTriggerKind["TriggerCharacter"] = 1] = "TriggerCharacter";
    CompletionTriggerKind[CompletionTriggerKind["TriggerForIncompleteCompletions"] = 2] = "TriggerForIncompleteCompletions";
})(CompletionTriggerKind || (CompletionTriggerKind = {}));
export var CompletionItemKind;
(function (CompletionItemKind) {
    CompletionItemKind[CompletionItemKind["Text"] = 0] = "Text";
    CompletionItemKind[CompletionItemKind["Method"] = 1] = "Method";
    CompletionItemKind[CompletionItemKind["Function"] = 2] = "Function";
    CompletionItemKind[CompletionItemKind["Constructor"] = 3] = "Constructor";
    CompletionItemKind[CompletionItemKind["Field"] = 4] = "Field";
    CompletionItemKind[CompletionItemKind["Variable"] = 5] = "Variable";
    CompletionItemKind[CompletionItemKind["Class"] = 6] = "Class";
    CompletionItemKind[CompletionItemKind["Interface"] = 7] = "Interface";
    CompletionItemKind[CompletionItemKind["Module"] = 8] = "Module";
    CompletionItemKind[CompletionItemKind["Property"] = 9] = "Property";
    CompletionItemKind[CompletionItemKind["Unit"] = 10] = "Unit";
    CompletionItemKind[CompletionItemKind["Value"] = 11] = "Value";
    CompletionItemKind[CompletionItemKind["Enum"] = 12] = "Enum";
    CompletionItemKind[CompletionItemKind["Keyword"] = 13] = "Keyword";
    CompletionItemKind[CompletionItemKind["Snippet"] = 14] = "Snippet";
    CompletionItemKind[CompletionItemKind["Color"] = 15] = "Color";
    CompletionItemKind[CompletionItemKind["File"] = 16] = "File";
    CompletionItemKind[CompletionItemKind["Reference"] = 17] = "Reference";
    CompletionItemKind[CompletionItemKind["Folder"] = 18] = "Folder";
    CompletionItemKind[CompletionItemKind["EnumMember"] = 19] = "EnumMember";
    CompletionItemKind[CompletionItemKind["Constant"] = 20] = "Constant";
    CompletionItemKind[CompletionItemKind["Struct"] = 21] = "Struct";
    CompletionItemKind[CompletionItemKind["Event"] = 22] = "Event";
    CompletionItemKind[CompletionItemKind["Operator"] = 23] = "Operator";
    CompletionItemKind[CompletionItemKind["TypeParameter"] = 24] = "TypeParameter";
    CompletionItemKind[CompletionItemKind["User"] = 25] = "User";
    CompletionItemKind[CompletionItemKind["Issue"] = 26] = "Issue";
})(CompletionItemKind || (CompletionItemKind = {}));
export var CompletionItemTag;
(function (CompletionItemTag) {
    CompletionItemTag[CompletionItemTag["Deprecated"] = 1] = "Deprecated";
})(CompletionItemTag || (CompletionItemTag = {}));
let CompletionItem = class CompletionItem {
    constructor(label, kind) {
        this.label = label;
        this.kind = kind;
    }
    toJSON() {
        return {
            label: this.label,
            kind: this.kind && CompletionItemKind[this.kind],
            detail: this.detail,
            documentation: this.documentation,
            sortText: this.sortText,
            filterText: this.filterText,
            preselect: this.preselect,
            insertText: this.insertText,
            textEdit: this.textEdit
        };
    }
};
CompletionItem = __decorate([
    es5ClassCompat
], CompletionItem);
export { CompletionItem };
let CompletionList = class CompletionList {
    constructor(items = [], isIncomplete = false) {
        this.items = items;
        this.isIncomplete = isIncomplete;
    }
};
CompletionList = __decorate([
    es5ClassCompat
], CompletionList);
export { CompletionList };
let InlineSuggestion = class InlineSuggestion {
    constructor(insertText, range, command) {
        this.insertText = insertText;
        this.range = range;
        this.command = command;
    }
};
InlineSuggestion = __decorate([
    es5ClassCompat
], InlineSuggestion);
export { InlineSuggestion };
let InlineSuggestionList = class InlineSuggestionList {
    constructor(items) {
        this.commands = undefined;
        this.suppressSuggestions = undefined;
        this.items = items;
    }
};
InlineSuggestionList = __decorate([
    es5ClassCompat
], InlineSuggestionList);
export { InlineSuggestionList };
export var PartialAcceptTriggerKind;
(function (PartialAcceptTriggerKind) {
    PartialAcceptTriggerKind[PartialAcceptTriggerKind["Unknown"] = 0] = "Unknown";
    PartialAcceptTriggerKind[PartialAcceptTriggerKind["Word"] = 1] = "Word";
    PartialAcceptTriggerKind[PartialAcceptTriggerKind["Line"] = 2] = "Line";
    PartialAcceptTriggerKind[PartialAcceptTriggerKind["Suggest"] = 3] = "Suggest";
})(PartialAcceptTriggerKind || (PartialAcceptTriggerKind = {}));
export var ViewColumn;
(function (ViewColumn) {
    ViewColumn[ViewColumn["Active"] = -1] = "Active";
    ViewColumn[ViewColumn["Beside"] = -2] = "Beside";
    ViewColumn[ViewColumn["One"] = 1] = "One";
    ViewColumn[ViewColumn["Two"] = 2] = "Two";
    ViewColumn[ViewColumn["Three"] = 3] = "Three";
    ViewColumn[ViewColumn["Four"] = 4] = "Four";
    ViewColumn[ViewColumn["Five"] = 5] = "Five";
    ViewColumn[ViewColumn["Six"] = 6] = "Six";
    ViewColumn[ViewColumn["Seven"] = 7] = "Seven";
    ViewColumn[ViewColumn["Eight"] = 8] = "Eight";
    ViewColumn[ViewColumn["Nine"] = 9] = "Nine";
})(ViewColumn || (ViewColumn = {}));
export var StatusBarAlignment;
(function (StatusBarAlignment) {
    StatusBarAlignment[StatusBarAlignment["Left"] = 1] = "Left";
    StatusBarAlignment[StatusBarAlignment["Right"] = 2] = "Right";
})(StatusBarAlignment || (StatusBarAlignment = {}));
export function asStatusBarItemIdentifier(extension, id) {
    return `${ExtensionIdentifier.toKey(extension)}.${id}`;
}
export var TextEditorLineNumbersStyle;
(function (TextEditorLineNumbersStyle) {
    TextEditorLineNumbersStyle[TextEditorLineNumbersStyle["Off"] = 0] = "Off";
    TextEditorLineNumbersStyle[TextEditorLineNumbersStyle["On"] = 1] = "On";
    TextEditorLineNumbersStyle[TextEditorLineNumbersStyle["Relative"] = 2] = "Relative";
    TextEditorLineNumbersStyle[TextEditorLineNumbersStyle["Interval"] = 3] = "Interval";
})(TextEditorLineNumbersStyle || (TextEditorLineNumbersStyle = {}));
export var TextDocumentSaveReason;
(function (TextDocumentSaveReason) {
    TextDocumentSaveReason[TextDocumentSaveReason["Manual"] = 1] = "Manual";
    TextDocumentSaveReason[TextDocumentSaveReason["AfterDelay"] = 2] = "AfterDelay";
    TextDocumentSaveReason[TextDocumentSaveReason["FocusOut"] = 3] = "FocusOut";
})(TextDocumentSaveReason || (TextDocumentSaveReason = {}));
export var TextEditorRevealType;
(function (TextEditorRevealType) {
    TextEditorRevealType[TextEditorRevealType["Default"] = 0] = "Default";
    TextEditorRevealType[TextEditorRevealType["InCenter"] = 1] = "InCenter";
    TextEditorRevealType[TextEditorRevealType["InCenterIfOutsideViewport"] = 2] = "InCenterIfOutsideViewport";
    TextEditorRevealType[TextEditorRevealType["AtTop"] = 3] = "AtTop";
})(TextEditorRevealType || (TextEditorRevealType = {}));
export var TextEditorSelectionChangeKind;
(function (TextEditorSelectionChangeKind) {
    TextEditorSelectionChangeKind[TextEditorSelectionChangeKind["Keyboard"] = 1] = "Keyboard";
    TextEditorSelectionChangeKind[TextEditorSelectionChangeKind["Mouse"] = 2] = "Mouse";
    TextEditorSelectionChangeKind[TextEditorSelectionChangeKind["Command"] = 3] = "Command";
})(TextEditorSelectionChangeKind || (TextEditorSelectionChangeKind = {}));
export var TextEditorChangeKind;
(function (TextEditorChangeKind) {
    TextEditorChangeKind[TextEditorChangeKind["Addition"] = 1] = "Addition";
    TextEditorChangeKind[TextEditorChangeKind["Deletion"] = 2] = "Deletion";
    TextEditorChangeKind[TextEditorChangeKind["Modification"] = 3] = "Modification";
})(TextEditorChangeKind || (TextEditorChangeKind = {}));
export var TextDocumentChangeReason;
(function (TextDocumentChangeReason) {
    TextDocumentChangeReason[TextDocumentChangeReason["Undo"] = 1] = "Undo";
    TextDocumentChangeReason[TextDocumentChangeReason["Redo"] = 2] = "Redo";
})(TextDocumentChangeReason || (TextDocumentChangeReason = {}));
/**
 * These values match very carefully the values of `TrackedRangeStickiness`
 */
export var DecorationRangeBehavior;
(function (DecorationRangeBehavior) {
    /**
     * TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges
     */
    DecorationRangeBehavior[DecorationRangeBehavior["OpenOpen"] = 0] = "OpenOpen";
    /**
     * TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
     */
    DecorationRangeBehavior[DecorationRangeBehavior["ClosedClosed"] = 1] = "ClosedClosed";
    /**
     * TrackedRangeStickiness.GrowsOnlyWhenTypingBefore
     */
    DecorationRangeBehavior[DecorationRangeBehavior["OpenClosed"] = 2] = "OpenClosed";
    /**
     * TrackedRangeStickiness.GrowsOnlyWhenTypingAfter
     */
    DecorationRangeBehavior[DecorationRangeBehavior["ClosedOpen"] = 3] = "ClosedOpen";
})(DecorationRangeBehavior || (DecorationRangeBehavior = {}));
(function (TextEditorSelectionChangeKind) {
    function fromValue(s) {
        switch (s) {
            case 'keyboard': return TextEditorSelectionChangeKind.Keyboard;
            case 'mouse': return TextEditorSelectionChangeKind.Mouse;
            case "api" /* TextEditorSelectionSource.PROGRAMMATIC */:
            case "code.jump" /* TextEditorSelectionSource.JUMP */:
            case "code.navigation" /* TextEditorSelectionSource.NAVIGATION */:
                return TextEditorSelectionChangeKind.Command;
        }
        return undefined;
    }
    TextEditorSelectionChangeKind.fromValue = fromValue;
})(TextEditorSelectionChangeKind || (TextEditorSelectionChangeKind = {}));
export var SyntaxTokenType;
(function (SyntaxTokenType) {
    SyntaxTokenType[SyntaxTokenType["Other"] = 0] = "Other";
    SyntaxTokenType[SyntaxTokenType["Comment"] = 1] = "Comment";
    SyntaxTokenType[SyntaxTokenType["String"] = 2] = "String";
    SyntaxTokenType[SyntaxTokenType["RegEx"] = 3] = "RegEx";
})(SyntaxTokenType || (SyntaxTokenType = {}));
(function (SyntaxTokenType) {
    function toString(v) {
        switch (v) {
            case SyntaxTokenType.Other: return 'other';
            case SyntaxTokenType.Comment: return 'comment';
            case SyntaxTokenType.String: return 'string';
            case SyntaxTokenType.RegEx: return 'regex';
        }
        return 'other';
    }
    SyntaxTokenType.toString = toString;
})(SyntaxTokenType || (SyntaxTokenType = {}));
let DocumentLink = class DocumentLink {
    constructor(range, target) {
        if (target && !(URI.isUri(target))) {
            throw illegalArgument('target');
        }
        if (!Range.isRange(range) || range.isEmpty) {
            throw illegalArgument('range');
        }
        this.range = range;
        this.target = target;
    }
};
DocumentLink = __decorate([
    es5ClassCompat
], DocumentLink);
export { DocumentLink };
let Color = class Color {
    constructor(red, green, blue, alpha) {
        this.red = red;
        this.green = green;
        this.blue = blue;
        this.alpha = alpha;
    }
};
Color = __decorate([
    es5ClassCompat
], Color);
export { Color };
let ColorInformation = class ColorInformation {
    constructor(range, color) {
        if (color && !(color instanceof Color)) {
            throw illegalArgument('color');
        }
        if (!Range.isRange(range) || range.isEmpty) {
            throw illegalArgument('range');
        }
        this.range = range;
        this.color = color;
    }
};
ColorInformation = __decorate([
    es5ClassCompat
], ColorInformation);
export { ColorInformation };
let ColorPresentation = class ColorPresentation {
    constructor(label) {
        if (!label || typeof label !== 'string') {
            throw illegalArgument('label');
        }
        this.label = label;
    }
};
ColorPresentation = __decorate([
    es5ClassCompat
], ColorPresentation);
export { ColorPresentation };
export var ColorFormat;
(function (ColorFormat) {
    ColorFormat[ColorFormat["RGB"] = 0] = "RGB";
    ColorFormat[ColorFormat["HEX"] = 1] = "HEX";
    ColorFormat[ColorFormat["HSL"] = 2] = "HSL";
})(ColorFormat || (ColorFormat = {}));
export var SourceControlInputBoxValidationType;
(function (SourceControlInputBoxValidationType) {
    SourceControlInputBoxValidationType[SourceControlInputBoxValidationType["Error"] = 0] = "Error";
    SourceControlInputBoxValidationType[SourceControlInputBoxValidationType["Warning"] = 1] = "Warning";
    SourceControlInputBoxValidationType[SourceControlInputBoxValidationType["Information"] = 2] = "Information";
})(SourceControlInputBoxValidationType || (SourceControlInputBoxValidationType = {}));
export var TerminalExitReason;
(function (TerminalExitReason) {
    TerminalExitReason[TerminalExitReason["Unknown"] = 0] = "Unknown";
    TerminalExitReason[TerminalExitReason["Shutdown"] = 1] = "Shutdown";
    TerminalExitReason[TerminalExitReason["Process"] = 2] = "Process";
    TerminalExitReason[TerminalExitReason["User"] = 3] = "User";
    TerminalExitReason[TerminalExitReason["Extension"] = 4] = "Extension";
})(TerminalExitReason || (TerminalExitReason = {}));
export var TerminalShellExecutionCommandLineConfidence;
(function (TerminalShellExecutionCommandLineConfidence) {
    TerminalShellExecutionCommandLineConfidence[TerminalShellExecutionCommandLineConfidence["Low"] = 0] = "Low";
    TerminalShellExecutionCommandLineConfidence[TerminalShellExecutionCommandLineConfidence["Medium"] = 1] = "Medium";
    TerminalShellExecutionCommandLineConfidence[TerminalShellExecutionCommandLineConfidence["High"] = 2] = "High";
})(TerminalShellExecutionCommandLineConfidence || (TerminalShellExecutionCommandLineConfidence = {}));
export var TerminalShellType;
(function (TerminalShellType) {
    TerminalShellType[TerminalShellType["Sh"] = 1] = "Sh";
    TerminalShellType[TerminalShellType["Bash"] = 2] = "Bash";
    TerminalShellType[TerminalShellType["Fish"] = 3] = "Fish";
    TerminalShellType[TerminalShellType["Csh"] = 4] = "Csh";
    TerminalShellType[TerminalShellType["Ksh"] = 5] = "Ksh";
    TerminalShellType[TerminalShellType["Zsh"] = 6] = "Zsh";
    TerminalShellType[TerminalShellType["CommandPrompt"] = 7] = "CommandPrompt";
    TerminalShellType[TerminalShellType["GitBash"] = 8] = "GitBash";
    TerminalShellType[TerminalShellType["PowerShell"] = 9] = "PowerShell";
    TerminalShellType[TerminalShellType["Python"] = 10] = "Python";
    TerminalShellType[TerminalShellType["Julia"] = 11] = "Julia";
    TerminalShellType[TerminalShellType["NuShell"] = 12] = "NuShell";
    TerminalShellType[TerminalShellType["Node"] = 13] = "Node";
})(TerminalShellType || (TerminalShellType = {}));
export class TerminalLink {
    constructor(startIndex, length, tooltip) {
        this.startIndex = startIndex;
        this.length = length;
        this.tooltip = tooltip;
        if (typeof startIndex !== 'number' || startIndex < 0) {
            throw illegalArgument('startIndex');
        }
        if (typeof length !== 'number' || length < 1) {
            throw illegalArgument('length');
        }
        if (tooltip !== undefined && typeof tooltip !== 'string') {
            throw illegalArgument('tooltip');
        }
    }
}
export class TerminalQuickFixOpener {
    constructor(uri) {
        this.uri = uri;
    }
}
export class TerminalQuickFixCommand {
    constructor(terminalCommand) {
        this.terminalCommand = terminalCommand;
    }
}
export var TerminalLocation;
(function (TerminalLocation) {
    TerminalLocation[TerminalLocation["Panel"] = 1] = "Panel";
    TerminalLocation[TerminalLocation["Editor"] = 2] = "Editor";
})(TerminalLocation || (TerminalLocation = {}));
export class TerminalProfile {
    constructor(options) {
        this.options = options;
        if (typeof options !== 'object') {
            throw illegalArgument('options');
        }
    }
}
export var TerminalCompletionItemKind;
(function (TerminalCompletionItemKind) {
    TerminalCompletionItemKind[TerminalCompletionItemKind["File"] = 0] = "File";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Folder"] = 1] = "Folder";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Method"] = 2] = "Method";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Alias"] = 3] = "Alias";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Argument"] = 4] = "Argument";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Option"] = 5] = "Option";
    TerminalCompletionItemKind[TerminalCompletionItemKind["OptionValue"] = 6] = "OptionValue";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Flag"] = 7] = "Flag";
})(TerminalCompletionItemKind || (TerminalCompletionItemKind = {}));
export class TerminalCompletionItem {
    constructor(label, icon, detail, documentation, isFile, isDirectory, isKeyword, replacementIndex, replacementLength) {
        this.label = label;
        this.icon = icon;
        this.detail = detail;
        this.documentation = documentation;
        this.isFile = isFile;
        this.isDirectory = isDirectory;
        this.isKeyword = isKeyword;
        this.replacementIndex = replacementIndex ?? 0;
        this.replacementLength = replacementLength ?? 0;
    }
}
/**
 * Represents a collection of {@link CompletionItem completion items} to be presented
 * in the editor.
 */
export class TerminalCompletionList {
    /**
     * Creates a new completion list.
     *
     * @param items The completion items.
     * @param isIncomplete The list is not complete.
     */
    constructor(items, resourceRequestConfig) {
        this.items = items ?? [];
        this.resourceRequestConfig = resourceRequestConfig;
    }
}
export var TaskRevealKind;
(function (TaskRevealKind) {
    TaskRevealKind[TaskRevealKind["Always"] = 1] = "Always";
    TaskRevealKind[TaskRevealKind["Silent"] = 2] = "Silent";
    TaskRevealKind[TaskRevealKind["Never"] = 3] = "Never";
})(TaskRevealKind || (TaskRevealKind = {}));
export var TaskEventKind;
(function (TaskEventKind) {
    /** Indicates a task's properties or configuration have changed */
    TaskEventKind["Changed"] = "changed";
    /** Indicates a task has begun executing */
    TaskEventKind["ProcessStarted"] = "processStarted";
    /** Indicates a task process has completed */
    TaskEventKind["ProcessEnded"] = "processEnded";
    /** Indicates a task was terminated, either by user action or by the system */
    TaskEventKind["Terminated"] = "terminated";
    /** Indicates a task has started running */
    TaskEventKind["Start"] = "start";
    /** Indicates a task has acquired all needed input/variables to execute */
    TaskEventKind["AcquiredInput"] = "acquiredInput";
    /** Indicates a dependent task has started */
    TaskEventKind["DependsOnStarted"] = "dependsOnStarted";
    /** Indicates a task is actively running/processing */
    TaskEventKind["Active"] = "active";
    /** Indicates a task is paused/waiting but not complete */
    TaskEventKind["Inactive"] = "inactive";
    /** Indicates a task has completed fully */
    TaskEventKind["End"] = "end";
    /** Indicates the task's problem matcher has started */
    TaskEventKind["ProblemMatcherStarted"] = "problemMatcherStarted";
    /** Indicates the task's problem matcher has ended without errors */
    TaskEventKind["ProblemMatcherEnded"] = "problemMatcherEnded";
    /** Indicates the task's problem matcher has ended with errors */
    TaskEventKind["ProblemMatcherFoundErrors"] = "problemMatcherFoundErrors";
})(TaskEventKind || (TaskEventKind = {}));
export var TaskPanelKind;
(function (TaskPanelKind) {
    TaskPanelKind[TaskPanelKind["Shared"] = 1] = "Shared";
    TaskPanelKind[TaskPanelKind["Dedicated"] = 2] = "Dedicated";
    TaskPanelKind[TaskPanelKind["New"] = 3] = "New";
})(TaskPanelKind || (TaskPanelKind = {}));
let TaskGroup = class TaskGroup {
    static { TaskGroup_1 = this; }
    static { this.Clean = new TaskGroup_1('clean', 'Clean'); }
    static { this.Build = new TaskGroup_1('build', 'Build'); }
    static { this.Rebuild = new TaskGroup_1('rebuild', 'Rebuild'); }
    static { this.Test = new TaskGroup_1('test', 'Test'); }
    static from(value) {
        switch (value) {
            case 'clean':
                return TaskGroup_1.Clean;
            case 'build':
                return TaskGroup_1.Build;
            case 'rebuild':
                return TaskGroup_1.Rebuild;
            case 'test':
                return TaskGroup_1.Test;
            default:
                return undefined;
        }
    }
    constructor(id, label) {
        this.label = label;
        if (typeof id !== 'string') {
            throw illegalArgument('name');
        }
        if (typeof label !== 'string') {
            throw illegalArgument('name');
        }
        this._id = id;
    }
    get id() {
        return this._id;
    }
};
TaskGroup = TaskGroup_1 = __decorate([
    es5ClassCompat
], TaskGroup);
export { TaskGroup };
function computeTaskExecutionId(values) {
    let id = '';
    for (let i = 0; i < values.length; i++) {
        id += values[i].replace(/,/g, ',,') + ',';
    }
    return id;
}
let ProcessExecution = class ProcessExecution {
    constructor(process, varg1, varg2) {
        if (typeof process !== 'string') {
            throw illegalArgument('process');
        }
        this._args = [];
        this._process = process;
        if (varg1 !== undefined) {
            if (Array.isArray(varg1)) {
                this._args = varg1;
                this._options = varg2;
            }
            else {
                this._options = varg1;
            }
        }
    }
    get process() {
        return this._process;
    }
    set process(value) {
        if (typeof value !== 'string') {
            throw illegalArgument('process');
        }
        this._process = value;
    }
    get args() {
        return this._args;
    }
    set args(value) {
        if (!Array.isArray(value)) {
            value = [];
        }
        this._args = value;
    }
    get options() {
        return this._options;
    }
    set options(value) {
        this._options = value;
    }
    computeId() {
        const props = [];
        props.push('process');
        if (this._process !== undefined) {
            props.push(this._process);
        }
        if (this._args && this._args.length > 0) {
            for (const arg of this._args) {
                props.push(arg);
            }
        }
        return computeTaskExecutionId(props);
    }
};
ProcessExecution = __decorate([
    es5ClassCompat
], ProcessExecution);
export { ProcessExecution };
let ShellExecution = class ShellExecution {
    constructor(arg0, arg1, arg2) {
        this._args = [];
        if (Array.isArray(arg1)) {
            if (!arg0) {
                throw illegalArgument('command can\'t be undefined or null');
            }
            if (typeof arg0 !== 'string' && typeof arg0.value !== 'string') {
                throw illegalArgument('command');
            }
            this._command = arg0;
            if (arg1) {
                this._args = arg1;
            }
            this._options = arg2;
        }
        else {
            if (typeof arg0 !== 'string') {
                throw illegalArgument('commandLine');
            }
            this._commandLine = arg0;
            this._options = arg1;
        }
    }
    get commandLine() {
        return this._commandLine;
    }
    set commandLine(value) {
        if (typeof value !== 'string') {
            throw illegalArgument('commandLine');
        }
        this._commandLine = value;
    }
    get command() {
        return this._command ? this._command : '';
    }
    set command(value) {
        if (typeof value !== 'string' && typeof value.value !== 'string') {
            throw illegalArgument('command');
        }
        this._command = value;
    }
    get args() {
        return this._args;
    }
    set args(value) {
        this._args = value || [];
    }
    get options() {
        return this._options;
    }
    set options(value) {
        this._options = value;
    }
    computeId() {
        const props = [];
        props.push('shell');
        if (this._commandLine !== undefined) {
            props.push(this._commandLine);
        }
        if (this._command !== undefined) {
            props.push(typeof this._command === 'string' ? this._command : this._command.value);
        }
        if (this._args && this._args.length > 0) {
            for (const arg of this._args) {
                props.push(typeof arg === 'string' ? arg : arg.value);
            }
        }
        return computeTaskExecutionId(props);
    }
};
ShellExecution = __decorate([
    es5ClassCompat
], ShellExecution);
export { ShellExecution };
export var ShellQuoting;
(function (ShellQuoting) {
    ShellQuoting[ShellQuoting["Escape"] = 1] = "Escape";
    ShellQuoting[ShellQuoting["Strong"] = 2] = "Strong";
    ShellQuoting[ShellQuoting["Weak"] = 3] = "Weak";
})(ShellQuoting || (ShellQuoting = {}));
export var TaskScope;
(function (TaskScope) {
    TaskScope[TaskScope["Global"] = 1] = "Global";
    TaskScope[TaskScope["Workspace"] = 2] = "Workspace";
})(TaskScope || (TaskScope = {}));
export class CustomExecution {
    constructor(callback) {
        this._callback = callback;
    }
    computeId() {
        return 'customExecution' + generateUuid();
    }
    set callback(value) {
        this._callback = value;
    }
    get callback() {
        return this._callback;
    }
}
let Task = class Task {
    static { Task_1 = this; }
    static { this.ExtensionCallbackType = 'customExecution'; }
    static { this.ProcessType = 'process'; }
    static { this.ShellType = 'shell'; }
    static { this.EmptyType = '$empty'; }
    constructor(definition, arg2, arg3, arg4, arg5, arg6) {
        this.__deprecated = false;
        this._definition = this.definition = definition;
        let problemMatchers;
        if (typeof arg2 === 'string') {
            this._name = this.name = arg2;
            this._source = this.source = arg3;
            this.execution = arg4;
            problemMatchers = arg5;
            this.__deprecated = true;
        }
        else if (arg2 === TaskScope.Global || arg2 === TaskScope.Workspace) {
            this.target = arg2;
            this._name = this.name = arg3;
            this._source = this.source = arg4;
            this.execution = arg5;
            problemMatchers = arg6;
        }
        else {
            this.target = arg2;
            this._name = this.name = arg3;
            this._source = this.source = arg4;
            this.execution = arg5;
            problemMatchers = arg6;
        }
        if (typeof problemMatchers === 'string') {
            this._problemMatchers = [problemMatchers];
            this._hasDefinedMatchers = true;
        }
        else if (Array.isArray(problemMatchers)) {
            this._problemMatchers = problemMatchers;
            this._hasDefinedMatchers = true;
        }
        else {
            this._problemMatchers = [];
            this._hasDefinedMatchers = false;
        }
        this._isBackground = false;
        this._presentationOptions = Object.create(null);
        this._runOptions = Object.create(null);
    }
    get _id() {
        return this.__id;
    }
    set _id(value) {
        this.__id = value;
    }
    get _deprecated() {
        return this.__deprecated;
    }
    clear() {
        if (this.__id === undefined) {
            return;
        }
        this.__id = undefined;
        this._scope = undefined;
        this.computeDefinitionBasedOnExecution();
    }
    computeDefinitionBasedOnExecution() {
        if (this._execution instanceof ProcessExecution) {
            this._definition = {
                type: Task_1.ProcessType,
                id: this._execution.computeId()
            };
        }
        else if (this._execution instanceof ShellExecution) {
            this._definition = {
                type: Task_1.ShellType,
                id: this._execution.computeId()
            };
        }
        else if (this._execution instanceof CustomExecution) {
            this._definition = {
                type: Task_1.ExtensionCallbackType,
                id: this._execution.computeId()
            };
        }
        else {
            this._definition = {
                type: Task_1.EmptyType,
                id: generateUuid()
            };
        }
    }
    get definition() {
        return this._definition;
    }
    set definition(value) {
        if (value === undefined || value === null) {
            throw illegalArgument('Kind can\'t be undefined or null');
        }
        this.clear();
        this._definition = value;
    }
    get scope() {
        return this._scope;
    }
    set target(value) {
        this.clear();
        this._scope = value;
    }
    get name() {
        return this._name;
    }
    set name(value) {
        if (typeof value !== 'string') {
            throw illegalArgument('name');
        }
        this.clear();
        this._name = value;
    }
    get execution() {
        return this._execution;
    }
    set execution(value) {
        if (value === null) {
            value = undefined;
        }
        this.clear();
        this._execution = value;
        const type = this._definition.type;
        if (Task_1.EmptyType === type || Task_1.ProcessType === type || Task_1.ShellType === type || Task_1.ExtensionCallbackType === type) {
            this.computeDefinitionBasedOnExecution();
        }
    }
    get problemMatchers() {
        return this._problemMatchers;
    }
    set problemMatchers(value) {
        if (!Array.isArray(value)) {
            this.clear();
            this._problemMatchers = [];
            this._hasDefinedMatchers = false;
            return;
        }
        else {
            this.clear();
            this._problemMatchers = value;
            this._hasDefinedMatchers = true;
        }
    }
    get hasDefinedMatchers() {
        return this._hasDefinedMatchers;
    }
    get isBackground() {
        return this._isBackground;
    }
    set isBackground(value) {
        if (value !== true && value !== false) {
            value = false;
        }
        this.clear();
        this._isBackground = value;
    }
    get source() {
        return this._source;
    }
    set source(value) {
        if (typeof value !== 'string' || value.length === 0) {
            throw illegalArgument('source must be a string of length > 0');
        }
        this.clear();
        this._source = value;
    }
    get group() {
        return this._group;
    }
    set group(value) {
        if (value === null) {
            value = undefined;
        }
        this.clear();
        this._group = value;
    }
    get detail() {
        return this._detail;
    }
    set detail(value) {
        if (value === null) {
            value = undefined;
        }
        this._detail = value;
    }
    get presentationOptions() {
        return this._presentationOptions;
    }
    set presentationOptions(value) {
        if (value === null || value === undefined) {
            value = Object.create(null);
        }
        this.clear();
        this._presentationOptions = value;
    }
    get runOptions() {
        return this._runOptions;
    }
    set runOptions(value) {
        if (value === null || value === undefined) {
            value = Object.create(null);
        }
        this.clear();
        this._runOptions = value;
    }
};
Task = Task_1 = __decorate([
    es5ClassCompat
], Task);
export { Task };
export var ProgressLocation;
(function (ProgressLocation) {
    ProgressLocation[ProgressLocation["SourceControl"] = 1] = "SourceControl";
    ProgressLocation[ProgressLocation["Window"] = 10] = "Window";
    ProgressLocation[ProgressLocation["Notification"] = 15] = "Notification";
})(ProgressLocation || (ProgressLocation = {}));
export var ViewBadge;
(function (ViewBadge) {
    function isViewBadge(thing) {
        const viewBadgeThing = thing;
        if (!isNumber(viewBadgeThing.value)) {
            console.log('INVALID view badge, invalid value', viewBadgeThing.value);
            return false;
        }
        if (viewBadgeThing.tooltip && !isString(viewBadgeThing.tooltip)) {
            console.log('INVALID view badge, invalid tooltip', viewBadgeThing.tooltip);
            return false;
        }
        return true;
    }
    ViewBadge.isViewBadge = isViewBadge;
})(ViewBadge || (ViewBadge = {}));
let TreeItem = TreeItem_1 = class TreeItem {
    static isTreeItem(thing, extension) {
        const treeItemThing = thing;
        if (treeItemThing.checkboxState !== undefined) {
            const checkbox = isNumber(treeItemThing.checkboxState) ? treeItemThing.checkboxState :
                isObject(treeItemThing.checkboxState) && isNumber(treeItemThing.checkboxState.state) ? treeItemThing.checkboxState.state : undefined;
            const tooltip = !isNumber(treeItemThing.checkboxState) && isObject(treeItemThing.checkboxState) ? treeItemThing.checkboxState.tooltip : undefined;
            if (checkbox === undefined || (checkbox !== TreeItemCheckboxState.Checked && checkbox !== TreeItemCheckboxState.Unchecked) || (tooltip !== undefined && !isString(tooltip))) {
                console.log('INVALID tree item, invalid checkboxState', treeItemThing.checkboxState);
                return false;
            }
        }
        if (thing instanceof TreeItem_1) {
            return true;
        }
        if (treeItemThing.label !== undefined && !isString(treeItemThing.label) && !(treeItemThing.label?.label)) {
            console.log('INVALID tree item, invalid label', treeItemThing.label);
            return false;
        }
        if ((treeItemThing.id !== undefined) && !isString(treeItemThing.id)) {
            console.log('INVALID tree item, invalid id', treeItemThing.id);
            return false;
        }
        if ((treeItemThing.iconPath !== undefined) && !isString(treeItemThing.iconPath) && !URI.isUri(treeItemThing.iconPath) && (!treeItemThing.iconPath || !isString(treeItemThing.iconPath.id))) {
            const asLightAndDarkThing = treeItemThing.iconPath;
            if (!asLightAndDarkThing || (!isString(asLightAndDarkThing.light) && !URI.isUri(asLightAndDarkThing.light) && !isString(asLightAndDarkThing.dark) && !URI.isUri(asLightAndDarkThing.dark))) {
                console.log('INVALID tree item, invalid iconPath', treeItemThing.iconPath);
                return false;
            }
        }
        if ((treeItemThing.description !== undefined) && !isString(treeItemThing.description) && (typeof treeItemThing.description !== 'boolean')) {
            console.log('INVALID tree item, invalid description', treeItemThing.description);
            return false;
        }
        if ((treeItemThing.resourceUri !== undefined) && !URI.isUri(treeItemThing.resourceUri)) {
            console.log('INVALID tree item, invalid resourceUri', treeItemThing.resourceUri);
            return false;
        }
        if ((treeItemThing.tooltip !== undefined) && !isString(treeItemThing.tooltip) && !(treeItemThing.tooltip instanceof MarkdownString)) {
            console.log('INVALID tree item, invalid tooltip', treeItemThing.tooltip);
            return false;
        }
        if ((treeItemThing.command !== undefined) && !treeItemThing.command.command) {
            console.log('INVALID tree item, invalid command', treeItemThing.command);
            return false;
        }
        if ((treeItemThing.collapsibleState !== undefined) && (treeItemThing.collapsibleState < TreeItemCollapsibleState.None) && (treeItemThing.collapsibleState > TreeItemCollapsibleState.Expanded)) {
            console.log('INVALID tree item, invalid collapsibleState', treeItemThing.collapsibleState);
            return false;
        }
        if ((treeItemThing.contextValue !== undefined) && !isString(treeItemThing.contextValue)) {
            console.log('INVALID tree item, invalid contextValue', treeItemThing.contextValue);
            return false;
        }
        if ((treeItemThing.accessibilityInformation !== undefined) && !treeItemThing.accessibilityInformation?.label) {
            console.log('INVALID tree item, invalid accessibilityInformation', treeItemThing.accessibilityInformation);
            return false;
        }
        return true;
    }
    constructor(arg1, collapsibleState = TreeItemCollapsibleState.None) {
        this.collapsibleState = collapsibleState;
        if (URI.isUri(arg1)) {
            this.resourceUri = arg1;
        }
        else {
            this.label = arg1;
        }
    }
};
TreeItem = TreeItem_1 = __decorate([
    es5ClassCompat
], TreeItem);
export { TreeItem };
export var TreeItemCollapsibleState;
(function (TreeItemCollapsibleState) {
    TreeItemCollapsibleState[TreeItemCollapsibleState["None"] = 0] = "None";
    TreeItemCollapsibleState[TreeItemCollapsibleState["Collapsed"] = 1] = "Collapsed";
    TreeItemCollapsibleState[TreeItemCollapsibleState["Expanded"] = 2] = "Expanded";
})(TreeItemCollapsibleState || (TreeItemCollapsibleState = {}));
export var TreeItemCheckboxState;
(function (TreeItemCheckboxState) {
    TreeItemCheckboxState[TreeItemCheckboxState["Unchecked"] = 0] = "Unchecked";
    TreeItemCheckboxState[TreeItemCheckboxState["Checked"] = 1] = "Checked";
})(TreeItemCheckboxState || (TreeItemCheckboxState = {}));
let DataTransferItem = class DataTransferItem {
    async asString() {
        return typeof this.value === 'string' ? this.value : JSON.stringify(this.value);
    }
    asFile() {
        return undefined;
    }
    constructor(value) {
        this.value = value;
    }
};
DataTransferItem = __decorate([
    es5ClassCompat
], DataTransferItem);
export { DataTransferItem };
/**
 * A data transfer item that has been created by VS Code instead of by a extension.
 *
 * Intentionally not exported to extensions.
 */
export class InternalDataTransferItem extends DataTransferItem {
}
/**
 * A data transfer item for a file.
 *
 * Intentionally not exported to extensions as only we can create these.
 */
export class InternalFileDataTransferItem extends InternalDataTransferItem {
    #file;
    constructor(file) {
        super('');
        this.#file = file;
    }
    asFile() {
        return this.#file;
    }
}
/**
 * Intentionally not exported to extensions
 */
export class DataTransferFile {
    constructor(name, uri, itemId, getData) {
        this.name = name;
        this.uri = uri;
        this._itemId = itemId;
        this._getData = getData;
    }
    data() {
        return this._getData();
    }
}
let DataTransfer = class DataTransfer {
    #items = new Map();
    constructor(init) {
        for (const [mime, item] of init ?? []) {
            const existing = this.#items.get(this.#normalizeMime(mime));
            if (existing) {
                existing.push(item);
            }
            else {
                this.#items.set(this.#normalizeMime(mime), [item]);
            }
        }
    }
    get(mimeType) {
        return this.#items.get(this.#normalizeMime(mimeType))?.[0];
    }
    set(mimeType, value) {
        // This intentionally overwrites all entries for a given mimetype.
        // This is similar to how the DOM DataTransfer type works
        this.#items.set(this.#normalizeMime(mimeType), [value]);
    }
    forEach(callbackfn, thisArg) {
        for (const [mime, items] of this.#items) {
            for (const item of items) {
                callbackfn.call(thisArg, item, mime, this);
            }
        }
    }
    *[Symbol.iterator]() {
        for (const [mime, items] of this.#items) {
            for (const item of items) {
                yield [mime, item];
            }
        }
    }
    #normalizeMime(mimeType) {
        return mimeType.toLowerCase();
    }
};
DataTransfer = __decorate([
    es5ClassCompat
], DataTransfer);
export { DataTransfer };
let DocumentDropEdit = class DocumentDropEdit {
    constructor(insertText, title, kind) {
        this.insertText = insertText;
        this.title = title;
        this.kind = kind;
    }
};
DocumentDropEdit = __decorate([
    es5ClassCompat
], DocumentDropEdit);
export { DocumentDropEdit };
export var DocumentPasteTriggerKind;
(function (DocumentPasteTriggerKind) {
    DocumentPasteTriggerKind[DocumentPasteTriggerKind["Automatic"] = 0] = "Automatic";
    DocumentPasteTriggerKind[DocumentPasteTriggerKind["PasteAs"] = 1] = "PasteAs";
})(DocumentPasteTriggerKind || (DocumentPasteTriggerKind = {}));
export class DocumentDropOrPasteEditKind {
    static { this.sep = '.'; }
    constructor(value) {
        this.value = value;
    }
    append(...parts) {
        return new DocumentDropOrPasteEditKind((this.value ? [this.value, ...parts] : parts).join(DocumentDropOrPasteEditKind.sep));
    }
    intersects(other) {
        return this.contains(other) || other.contains(this);
    }
    contains(other) {
        return this.value === other.value || other.value.startsWith(this.value + DocumentDropOrPasteEditKind.sep);
    }
}
DocumentDropOrPasteEditKind.Empty = new DocumentDropOrPasteEditKind('');
DocumentDropOrPasteEditKind.Text = new DocumentDropOrPasteEditKind('text');
DocumentDropOrPasteEditKind.TextUpdateImports = DocumentDropOrPasteEditKind.Text.append('updateImports');
export class DocumentPasteEdit {
    constructor(insertText, title, kind) {
        this.title = title;
        this.insertText = insertText;
        this.kind = kind;
    }
}
let ThemeIcon = class ThemeIcon {
    constructor(id, color) {
        this.id = id;
        this.color = color;
    }
    static isThemeIcon(thing) {
        if (typeof thing.id !== 'string') {
            console.log('INVALID ThemeIcon, invalid id', thing.id);
            return false;
        }
        return true;
    }
};
ThemeIcon = __decorate([
    es5ClassCompat
], ThemeIcon);
export { ThemeIcon };
ThemeIcon.File = new ThemeIcon('file');
ThemeIcon.Folder = new ThemeIcon('folder');
let ThemeColor = class ThemeColor {
    constructor(id) {
        this.id = id;
    }
};
ThemeColor = __decorate([
    es5ClassCompat
], ThemeColor);
export { ThemeColor };
export var ConfigurationTarget;
(function (ConfigurationTarget) {
    ConfigurationTarget[ConfigurationTarget["Global"] = 1] = "Global";
    ConfigurationTarget[ConfigurationTarget["Workspace"] = 2] = "Workspace";
    ConfigurationTarget[ConfigurationTarget["WorkspaceFolder"] = 3] = "WorkspaceFolder";
})(ConfigurationTarget || (ConfigurationTarget = {}));
let RelativePattern = class RelativePattern {
    get base() {
        return this._base;
    }
    set base(base) {
        this._base = base;
        this._baseUri = URI.file(base);
    }
    get baseUri() {
        return this._baseUri;
    }
    set baseUri(baseUri) {
        this._baseUri = baseUri;
        this._base = baseUri.fsPath;
    }
    constructor(base, pattern) {
        if (typeof base !== 'string') {
            if (!base || !URI.isUri(base) && !URI.isUri(base.uri)) {
                throw illegalArgument('base');
            }
        }
        if (typeof pattern !== 'string') {
            throw illegalArgument('pattern');
        }
        if (typeof base === 'string') {
            this.baseUri = URI.file(base);
        }
        else if (URI.isUri(base)) {
            this.baseUri = base;
        }
        else {
            this.baseUri = base.uri;
        }
        this.pattern = pattern;
    }
    toJSON() {
        return {
            pattern: this.pattern,
            base: this.base,
            baseUri: this.baseUri.toJSON()
        };
    }
};
RelativePattern = __decorate([
    es5ClassCompat
], RelativePattern);
export { RelativePattern };
const breakpointIds = new WeakMap();
/**
 * We want to be able to construct Breakpoints internally that have a particular id, but we don't want extensions to be
 * able to do this with the exposed Breakpoint classes in extension API.
 * We also want "instanceof" to work with debug.breakpoints and the exposed breakpoint classes.
 * And private members will be renamed in the built js, so casting to any and setting a private member is not safe.
 * So, we store internal breakpoint IDs in a WeakMap. This function must be called after constructing a Breakpoint
 * with a known id.
 */
export function setBreakpointId(bp, id) {
    breakpointIds.set(bp, id);
}
let Breakpoint = class Breakpoint {
    constructor(enabled, condition, hitCondition, logMessage, mode) {
        this.enabled = typeof enabled === 'boolean' ? enabled : true;
        if (typeof condition === 'string') {
            this.condition = condition;
        }
        if (typeof hitCondition === 'string') {
            this.hitCondition = hitCondition;
        }
        if (typeof logMessage === 'string') {
            this.logMessage = logMessage;
        }
        if (typeof mode === 'string') {
            this.mode = mode;
        }
    }
    get id() {
        if (!this._id) {
            this._id = breakpointIds.get(this) ?? generateUuid();
        }
        return this._id;
    }
};
Breakpoint = __decorate([
    es5ClassCompat
], Breakpoint);
export { Breakpoint };
let SourceBreakpoint = class SourceBreakpoint extends Breakpoint {
    constructor(location, enabled, condition, hitCondition, logMessage, mode) {
        super(enabled, condition, hitCondition, logMessage, mode);
        if (location === null) {
            throw illegalArgument('location');
        }
        this.location = location;
    }
};
SourceBreakpoint = __decorate([
    es5ClassCompat
], SourceBreakpoint);
export { SourceBreakpoint };
let FunctionBreakpoint = class FunctionBreakpoint extends Breakpoint {
    constructor(functionName, enabled, condition, hitCondition, logMessage, mode) {
        super(enabled, condition, hitCondition, logMessage, mode);
        this.functionName = functionName;
    }
};
FunctionBreakpoint = __decorate([
    es5ClassCompat
], FunctionBreakpoint);
export { FunctionBreakpoint };
let DataBreakpoint = class DataBreakpoint extends Breakpoint {
    constructor(label, dataId, canPersist, enabled, condition, hitCondition, logMessage, mode) {
        super(enabled, condition, hitCondition, logMessage, mode);
        if (!dataId) {
            throw illegalArgument('dataId');
        }
        this.label = label;
        this.dataId = dataId;
        this.canPersist = canPersist;
    }
};
DataBreakpoint = __decorate([
    es5ClassCompat
], DataBreakpoint);
export { DataBreakpoint };
let DebugAdapterExecutable = class DebugAdapterExecutable {
    constructor(command, args, options) {
        this.command = command;
        this.args = args || [];
        this.options = options;
    }
};
DebugAdapterExecutable = __decorate([
    es5ClassCompat
], DebugAdapterExecutable);
export { DebugAdapterExecutable };
let DebugAdapterServer = class DebugAdapterServer {
    constructor(port, host) {
        this.port = port;
        this.host = host;
    }
};
DebugAdapterServer = __decorate([
    es5ClassCompat
], DebugAdapterServer);
export { DebugAdapterServer };
let DebugAdapterNamedPipeServer = class DebugAdapterNamedPipeServer {
    constructor(path) {
        this.path = path;
    }
};
DebugAdapterNamedPipeServer = __decorate([
    es5ClassCompat
], DebugAdapterNamedPipeServer);
export { DebugAdapterNamedPipeServer };
let DebugAdapterInlineImplementation = class DebugAdapterInlineImplementation {
    constructor(impl) {
        this.implementation = impl;
    }
};
DebugAdapterInlineImplementation = __decorate([
    es5ClassCompat
], DebugAdapterInlineImplementation);
export { DebugAdapterInlineImplementation };
export class DebugStackFrame {
    constructor(session, threadId, frameId) {
        this.session = session;
        this.threadId = threadId;
        this.frameId = frameId;
    }
}
export class DebugThread {
    constructor(session, threadId) {
        this.session = session;
        this.threadId = threadId;
    }
}
let EvaluatableExpression = class EvaluatableExpression {
    constructor(range, expression) {
        this.range = range;
        this.expression = expression;
    }
};
EvaluatableExpression = __decorate([
    es5ClassCompat
], EvaluatableExpression);
export { EvaluatableExpression };
export var InlineCompletionTriggerKind;
(function (InlineCompletionTriggerKind) {
    InlineCompletionTriggerKind[InlineCompletionTriggerKind["Invoke"] = 0] = "Invoke";
    InlineCompletionTriggerKind[InlineCompletionTriggerKind["Automatic"] = 1] = "Automatic";
})(InlineCompletionTriggerKind || (InlineCompletionTriggerKind = {}));
let InlineValueText = class InlineValueText {
    constructor(range, text) {
        this.range = range;
        this.text = text;
    }
};
InlineValueText = __decorate([
    es5ClassCompat
], InlineValueText);
export { InlineValueText };
let InlineValueVariableLookup = class InlineValueVariableLookup {
    constructor(range, variableName, caseSensitiveLookup = true) {
        this.range = range;
        this.variableName = variableName;
        this.caseSensitiveLookup = caseSensitiveLookup;
    }
};
InlineValueVariableLookup = __decorate([
    es5ClassCompat
], InlineValueVariableLookup);
export { InlineValueVariableLookup };
let InlineValueEvaluatableExpression = class InlineValueEvaluatableExpression {
    constructor(range, expression) {
        this.range = range;
        this.expression = expression;
    }
};
InlineValueEvaluatableExpression = __decorate([
    es5ClassCompat
], InlineValueEvaluatableExpression);
export { InlineValueEvaluatableExpression };
let InlineValueContext = class InlineValueContext {
    constructor(frameId, range) {
        this.frameId = frameId;
        this.stoppedLocation = range;
    }
};
InlineValueContext = __decorate([
    es5ClassCompat
], InlineValueContext);
export { InlineValueContext };
export var NewSymbolNameTag;
(function (NewSymbolNameTag) {
    NewSymbolNameTag[NewSymbolNameTag["AIGenerated"] = 1] = "AIGenerated";
})(NewSymbolNameTag || (NewSymbolNameTag = {}));
export var NewSymbolNameTriggerKind;
(function (NewSymbolNameTriggerKind) {
    NewSymbolNameTriggerKind[NewSymbolNameTriggerKind["Invoke"] = 0] = "Invoke";
    NewSymbolNameTriggerKind[NewSymbolNameTriggerKind["Automatic"] = 1] = "Automatic";
})(NewSymbolNameTriggerKind || (NewSymbolNameTriggerKind = {}));
export class NewSymbolName {
    constructor(newSymbolName, tags) {
        this.newSymbolName = newSymbolName;
        this.tags = tags;
    }
}
//#region file api
export var FileChangeType;
(function (FileChangeType) {
    FileChangeType[FileChangeType["Changed"] = 1] = "Changed";
    FileChangeType[FileChangeType["Created"] = 2] = "Created";
    FileChangeType[FileChangeType["Deleted"] = 3] = "Deleted";
})(FileChangeType || (FileChangeType = {}));
let FileSystemError = FileSystemError_1 = class FileSystemError extends Error {
    static FileExists(messageOrUri) {
        return new FileSystemError_1(messageOrUri, FileSystemProviderErrorCode.FileExists, FileSystemError_1.FileExists);
    }
    static FileNotFound(messageOrUri) {
        return new FileSystemError_1(messageOrUri, FileSystemProviderErrorCode.FileNotFound, FileSystemError_1.FileNotFound);
    }
    static FileNotADirectory(messageOrUri) {
        return new FileSystemError_1(messageOrUri, FileSystemProviderErrorCode.FileNotADirectory, FileSystemError_1.FileNotADirectory);
    }
    static FileIsADirectory(messageOrUri) {
        return new FileSystemError_1(messageOrUri, FileSystemProviderErrorCode.FileIsADirectory, FileSystemError_1.FileIsADirectory);
    }
    static NoPermissions(messageOrUri) {
        return new FileSystemError_1(messageOrUri, FileSystemProviderErrorCode.NoPermissions, FileSystemError_1.NoPermissions);
    }
    static Unavailable(messageOrUri) {
        return new FileSystemError_1(messageOrUri, FileSystemProviderErrorCode.Unavailable, FileSystemError_1.Unavailable);
    }
    constructor(uriOrMessage, code = FileSystemProviderErrorCode.Unknown, terminator) {
        super(URI.isUri(uriOrMessage) ? uriOrMessage.toString(true) : uriOrMessage);
        this.code = terminator?.name ?? 'Unknown';
        // mark the error as file system provider error so that
        // we can extract the error code on the receiving side
        markAsFileSystemProviderError(this, code);
        // workaround when extending builtin objects and when compiling to ES5, see:
        // https://github.com/microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(this, FileSystemError_1.prototype);
        if (typeof Error.captureStackTrace === 'function' && typeof terminator === 'function') {
            // nice stack traces
            Error.captureStackTrace(this, terminator);
        }
    }
};
FileSystemError = FileSystemError_1 = __decorate([
    es5ClassCompat
], FileSystemError);
export { FileSystemError };
//#endregion
//#region folding api
let FoldingRange = class FoldingRange {
    constructor(start, end, kind) {
        this.start = start;
        this.end = end;
        this.kind = kind;
    }
};
FoldingRange = __decorate([
    es5ClassCompat
], FoldingRange);
export { FoldingRange };
export var FoldingRangeKind;
(function (FoldingRangeKind) {
    FoldingRangeKind[FoldingRangeKind["Comment"] = 1] = "Comment";
    FoldingRangeKind[FoldingRangeKind["Imports"] = 2] = "Imports";
    FoldingRangeKind[FoldingRangeKind["Region"] = 3] = "Region";
})(FoldingRangeKind || (FoldingRangeKind = {}));
//#endregion
//#region Comment
export var CommentThreadCollapsibleState;
(function (CommentThreadCollapsibleState) {
    /**
     * Determines an item is collapsed
     */
    CommentThreadCollapsibleState[CommentThreadCollapsibleState["Collapsed"] = 0] = "Collapsed";
    /**
     * Determines an item is expanded
     */
    CommentThreadCollapsibleState[CommentThreadCollapsibleState["Expanded"] = 1] = "Expanded";
})(CommentThreadCollapsibleState || (CommentThreadCollapsibleState = {}));
export var CommentMode;
(function (CommentMode) {
    CommentMode[CommentMode["Editing"] = 0] = "Editing";
    CommentMode[CommentMode["Preview"] = 1] = "Preview";
})(CommentMode || (CommentMode = {}));
export var CommentState;
(function (CommentState) {
    CommentState[CommentState["Published"] = 0] = "Published";
    CommentState[CommentState["Draft"] = 1] = "Draft";
})(CommentState || (CommentState = {}));
export var CommentThreadState;
(function (CommentThreadState) {
    CommentThreadState[CommentThreadState["Unresolved"] = 0] = "Unresolved";
    CommentThreadState[CommentThreadState["Resolved"] = 1] = "Resolved";
})(CommentThreadState || (CommentThreadState = {}));
export var CommentThreadApplicability;
(function (CommentThreadApplicability) {
    CommentThreadApplicability[CommentThreadApplicability["Current"] = 0] = "Current";
    CommentThreadApplicability[CommentThreadApplicability["Outdated"] = 1] = "Outdated";
})(CommentThreadApplicability || (CommentThreadApplicability = {}));
export var CommentThreadFocus;
(function (CommentThreadFocus) {
    CommentThreadFocus[CommentThreadFocus["Reply"] = 1] = "Reply";
    CommentThreadFocus[CommentThreadFocus["Comment"] = 2] = "Comment";
})(CommentThreadFocus || (CommentThreadFocus = {}));
//#endregion
//#region Semantic Coloring
export class SemanticTokensLegend {
    constructor(tokenTypes, tokenModifiers = []) {
        this.tokenTypes = tokenTypes;
        this.tokenModifiers = tokenModifiers;
    }
}
function isStrArrayOrUndefined(arg) {
    return ((typeof arg === 'undefined') || isStringArray(arg));
}
export class SemanticTokensBuilder {
    constructor(legend) {
        this._prevLine = 0;
        this._prevChar = 0;
        this._dataIsSortedAndDeltaEncoded = true;
        this._data = [];
        this._dataLen = 0;
        this._tokenTypeStrToInt = new Map();
        this._tokenModifierStrToInt = new Map();
        this._hasLegend = false;
        if (legend) {
            this._hasLegend = true;
            for (let i = 0, len = legend.tokenTypes.length; i < len; i++) {
                this._tokenTypeStrToInt.set(legend.tokenTypes[i], i);
            }
            for (let i = 0, len = legend.tokenModifiers.length; i < len; i++) {
                this._tokenModifierStrToInt.set(legend.tokenModifiers[i], i);
            }
        }
    }
    push(arg0, arg1, arg2, arg3, arg4) {
        if (typeof arg0 === 'number' && typeof arg1 === 'number' && typeof arg2 === 'number' && typeof arg3 === 'number' && (typeof arg4 === 'number' || typeof arg4 === 'undefined')) {
            if (typeof arg4 === 'undefined') {
                arg4 = 0;
            }
            // 1st overload
            return this._pushEncoded(arg0, arg1, arg2, arg3, arg4);
        }
        if (Range.isRange(arg0) && typeof arg1 === 'string' && isStrArrayOrUndefined(arg2)) {
            // 2nd overload
            return this._push(arg0, arg1, arg2);
        }
        throw illegalArgument();
    }
    _push(range, tokenType, tokenModifiers) {
        if (!this._hasLegend) {
            throw new Error('Legend must be provided in constructor');
        }
        if (range.start.line !== range.end.line) {
            throw new Error('`range` cannot span multiple lines');
        }
        if (!this._tokenTypeStrToInt.has(tokenType)) {
            throw new Error('`tokenType` is not in the provided legend');
        }
        const line = range.start.line;
        const char = range.start.character;
        const length = range.end.character - range.start.character;
        const nTokenType = this._tokenTypeStrToInt.get(tokenType);
        let nTokenModifiers = 0;
        if (tokenModifiers) {
            for (const tokenModifier of tokenModifiers) {
                if (!this._tokenModifierStrToInt.has(tokenModifier)) {
                    throw new Error('`tokenModifier` is not in the provided legend');
                }
                const nTokenModifier = this._tokenModifierStrToInt.get(tokenModifier);
                nTokenModifiers |= (1 << nTokenModifier) >>> 0;
            }
        }
        this._pushEncoded(line, char, length, nTokenType, nTokenModifiers);
    }
    _pushEncoded(line, char, length, tokenType, tokenModifiers) {
        if (this._dataIsSortedAndDeltaEncoded && (line < this._prevLine || (line === this._prevLine && char < this._prevChar))) {
            // push calls were ordered and are no longer ordered
            this._dataIsSortedAndDeltaEncoded = false;
            // Remove delta encoding from data
            const tokenCount = (this._data.length / 5) | 0;
            let prevLine = 0;
            let prevChar = 0;
            for (let i = 0; i < tokenCount; i++) {
                let line = this._data[5 * i];
                let char = this._data[5 * i + 1];
                if (line === 0) {
                    // on the same line as previous token
                    line = prevLine;
                    char += prevChar;
                }
                else {
                    // on a different line than previous token
                    line += prevLine;
                }
                this._data[5 * i] = line;
                this._data[5 * i + 1] = char;
                prevLine = line;
                prevChar = char;
            }
        }
        let pushLine = line;
        let pushChar = char;
        if (this._dataIsSortedAndDeltaEncoded && this._dataLen > 0) {
            pushLine -= this._prevLine;
            if (pushLine === 0) {
                pushChar -= this._prevChar;
            }
        }
        this._data[this._dataLen++] = pushLine;
        this._data[this._dataLen++] = pushChar;
        this._data[this._dataLen++] = length;
        this._data[this._dataLen++] = tokenType;
        this._data[this._dataLen++] = tokenModifiers;
        this._prevLine = line;
        this._prevChar = char;
    }
    static _sortAndDeltaEncode(data) {
        const pos = [];
        const tokenCount = (data.length / 5) | 0;
        for (let i = 0; i < tokenCount; i++) {
            pos[i] = i;
        }
        pos.sort((a, b) => {
            const aLine = data[5 * a];
            const bLine = data[5 * b];
            if (aLine === bLine) {
                const aChar = data[5 * a + 1];
                const bChar = data[5 * b + 1];
                return aChar - bChar;
            }
            return aLine - bLine;
        });
        const result = new Uint32Array(data.length);
        let prevLine = 0;
        let prevChar = 0;
        for (let i = 0; i < tokenCount; i++) {
            const srcOffset = 5 * pos[i];
            const line = data[srcOffset + 0];
            const char = data[srcOffset + 1];
            const length = data[srcOffset + 2];
            const tokenType = data[srcOffset + 3];
            const tokenModifiers = data[srcOffset + 4];
            const pushLine = line - prevLine;
            const pushChar = (pushLine === 0 ? char - prevChar : char);
            const dstOffset = 5 * i;
            result[dstOffset + 0] = pushLine;
            result[dstOffset + 1] = pushChar;
            result[dstOffset + 2] = length;
            result[dstOffset + 3] = tokenType;
            result[dstOffset + 4] = tokenModifiers;
            prevLine = line;
            prevChar = char;
        }
        return result;
    }
    build(resultId) {
        if (!this._dataIsSortedAndDeltaEncoded) {
            return new SemanticTokens(SemanticTokensBuilder._sortAndDeltaEncode(this._data), resultId);
        }
        return new SemanticTokens(new Uint32Array(this._data), resultId);
    }
}
export class SemanticTokens {
    constructor(data, resultId) {
        this.resultId = resultId;
        this.data = data;
    }
}
export class SemanticTokensEdit {
    constructor(start, deleteCount, data) {
        this.start = start;
        this.deleteCount = deleteCount;
        this.data = data;
    }
}
export class SemanticTokensEdits {
    constructor(edits, resultId) {
        this.resultId = resultId;
        this.edits = edits;
    }
}
//#endregion
//#region debug
export var DebugConsoleMode;
(function (DebugConsoleMode) {
    /**
     * Debug session should have a separate debug console.
     */
    DebugConsoleMode[DebugConsoleMode["Separate"] = 0] = "Separate";
    /**
     * Debug session should share debug console with its parent session.
     * This value has no effect for sessions which do not have a parent session.
     */
    DebugConsoleMode[DebugConsoleMode["MergeWithParent"] = 1] = "MergeWithParent";
})(DebugConsoleMode || (DebugConsoleMode = {}));
export class DebugVisualization {
    constructor(name) {
        this.name = name;
    }
}
//#endregion
export var QuickInputButtonLocation;
(function (QuickInputButtonLocation) {
    QuickInputButtonLocation[QuickInputButtonLocation["Title"] = 1] = "Title";
    QuickInputButtonLocation[QuickInputButtonLocation["Inline"] = 2] = "Inline";
})(QuickInputButtonLocation || (QuickInputButtonLocation = {}));
let QuickInputButtons = class QuickInputButtons {
    static { this.Back = { iconPath: new ThemeIcon('arrow-left') }; }
    constructor() { }
};
QuickInputButtons = __decorate([
    es5ClassCompat
], QuickInputButtons);
export { QuickInputButtons };
export var QuickPickItemKind;
(function (QuickPickItemKind) {
    QuickPickItemKind[QuickPickItemKind["Separator"] = -1] = "Separator";
    QuickPickItemKind[QuickPickItemKind["Default"] = 0] = "Default";
})(QuickPickItemKind || (QuickPickItemKind = {}));
export var InputBoxValidationSeverity;
(function (InputBoxValidationSeverity) {
    InputBoxValidationSeverity[InputBoxValidationSeverity["Info"] = 1] = "Info";
    InputBoxValidationSeverity[InputBoxValidationSeverity["Warning"] = 2] = "Warning";
    InputBoxValidationSeverity[InputBoxValidationSeverity["Error"] = 3] = "Error";
})(InputBoxValidationSeverity || (InputBoxValidationSeverity = {}));
export var ExtensionKind;
(function (ExtensionKind) {
    ExtensionKind[ExtensionKind["UI"] = 1] = "UI";
    ExtensionKind[ExtensionKind["Workspace"] = 2] = "Workspace";
})(ExtensionKind || (ExtensionKind = {}));
export class FileDecoration {
    static validate(d) {
        if (typeof d.badge === 'string') {
            let len = nextCharLength(d.badge, 0);
            if (len < d.badge.length) {
                len += nextCharLength(d.badge, len);
            }
            if (d.badge.length > len) {
                throw new Error(`The 'badge'-property must be undefined or a short character`);
            }
        }
        else if (d.badge) {
            if (!ThemeIcon.isThemeIcon(d.badge)) {
                throw new Error(`The 'badge'-property is not a valid ThemeIcon`);
            }
        }
        if (!d.color && !d.badge && !d.tooltip) {
            throw new Error(`The decoration is empty`);
        }
        return true;
    }
    constructor(badge, tooltip, color) {
        this.badge = badge;
        this.tooltip = tooltip;
        this.color = color;
    }
}
//#region Theming
let ColorTheme = class ColorTheme {
    constructor(kind) {
        this.kind = kind;
    }
};
ColorTheme = __decorate([
    es5ClassCompat
], ColorTheme);
export { ColorTheme };
export var ColorThemeKind;
(function (ColorThemeKind) {
    ColorThemeKind[ColorThemeKind["Light"] = 1] = "Light";
    ColorThemeKind[ColorThemeKind["Dark"] = 2] = "Dark";
    ColorThemeKind[ColorThemeKind["HighContrast"] = 3] = "HighContrast";
    ColorThemeKind[ColorThemeKind["HighContrastLight"] = 4] = "HighContrastLight";
})(ColorThemeKind || (ColorThemeKind = {}));
//#endregion Theming
//#region Notebook
export class NotebookRange {
    static isNotebookRange(thing) {
        if (thing instanceof NotebookRange) {
            return true;
        }
        if (!thing) {
            return false;
        }
        return typeof thing.start === 'number'
            && typeof thing.end === 'number';
    }
    get start() {
        return this._start;
    }
    get end() {
        return this._end;
    }
    get isEmpty() {
        return this._start === this._end;
    }
    constructor(start, end) {
        if (start < 0) {
            throw illegalArgument('start must be positive');
        }
        if (end < 0) {
            throw illegalArgument('end must be positive');
        }
        if (start <= end) {
            this._start = start;
            this._end = end;
        }
        else {
            this._start = end;
            this._end = start;
        }
    }
    with(change) {
        let start = this._start;
        let end = this._end;
        if (change.start !== undefined) {
            start = change.start;
        }
        if (change.end !== undefined) {
            end = change.end;
        }
        if (start === this._start && end === this._end) {
            return this;
        }
        return new NotebookRange(start, end);
    }
}
export class NotebookCellData {
    static validate(data) {
        if (typeof data.kind !== 'number') {
            throw new Error('NotebookCellData MUST have \'kind\' property');
        }
        if (typeof data.value !== 'string') {
            throw new Error('NotebookCellData MUST have \'value\' property');
        }
        if (typeof data.languageId !== 'string') {
            throw new Error('NotebookCellData MUST have \'languageId\' property');
        }
    }
    static isNotebookCellDataArray(value) {
        return Array.isArray(value) && value.every(elem => NotebookCellData.isNotebookCellData(elem));
    }
    static isNotebookCellData(value) {
        // return value instanceof NotebookCellData;
        return true;
    }
    constructor(kind, value, languageId, mime, outputs, metadata, executionSummary) {
        this.kind = kind;
        this.value = value;
        this.languageId = languageId;
        this.mime = mime;
        this.outputs = outputs ?? [];
        this.metadata = metadata;
        this.executionSummary = executionSummary;
        NotebookCellData.validate(this);
    }
}
export class NotebookData {
    constructor(cells) {
        this.cells = cells;
    }
}
export class NotebookCellOutputItem {
    static isNotebookCellOutputItem(obj) {
        if (obj instanceof NotebookCellOutputItem) {
            return true;
        }
        if (!obj) {
            return false;
        }
        return typeof obj.mime === 'string'
            && obj.data instanceof Uint8Array;
    }
    static error(err) {
        const obj = {
            name: err.name,
            message: err.message,
            stack: err.stack
        };
        return NotebookCellOutputItem.json(obj, 'application/vnd.code.notebook.error');
    }
    static stdout(value) {
        return NotebookCellOutputItem.text(value, 'application/vnd.code.notebook.stdout');
    }
    static stderr(value) {
        return NotebookCellOutputItem.text(value, 'application/vnd.code.notebook.stderr');
    }
    static bytes(value, mime = 'application/octet-stream') {
        return new NotebookCellOutputItem(value, mime);
    }
    static #encoder = new TextEncoder();
    static text(value, mime = Mimes.text) {
        const bytes = NotebookCellOutputItem.#encoder.encode(String(value));
        return new NotebookCellOutputItem(bytes, mime);
    }
    static json(value, mime = 'text/x-json') {
        const rawStr = JSON.stringify(value, undefined, '\t');
        return NotebookCellOutputItem.text(rawStr, mime);
    }
    constructor(data, mime) {
        this.data = data;
        this.mime = mime;
        const mimeNormalized = normalizeMimeType(mime, true);
        if (!mimeNormalized) {
            throw new Error(`INVALID mime type: ${mime}. Must be in the format "type/subtype[;optionalparameter]"`);
        }
        this.mime = mimeNormalized;
    }
}
export class NotebookCellOutput {
    static isNotebookCellOutput(candidate) {
        if (candidate instanceof NotebookCellOutput) {
            return true;
        }
        if (!candidate || typeof candidate !== 'object') {
            return false;
        }
        return typeof candidate.id === 'string' && Array.isArray(candidate.items);
    }
    static ensureUniqueMimeTypes(items, warn = false) {
        const seen = new Set();
        const removeIdx = new Set();
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const normalMime = normalizeMimeType(item.mime);
            // We can have multiple text stream mime types in the same output.
            if (!seen.has(normalMime) || isTextStreamMime(normalMime)) {
                seen.add(normalMime);
                continue;
            }
            // duplicated mime types... first has won
            removeIdx.add(i);
            if (warn) {
                console.warn(`DUPLICATED mime type '${item.mime}' will be dropped`);
            }
        }
        if (removeIdx.size === 0) {
            return items;
        }
        return items.filter((_item, index) => !removeIdx.has(index));
    }
    constructor(items, idOrMetadata, metadata) {
        this.items = NotebookCellOutput.ensureUniqueMimeTypes(items, true);
        if (typeof idOrMetadata === 'string') {
            this.id = idOrMetadata;
            this.metadata = metadata;
        }
        else {
            this.id = generateUuid();
            this.metadata = idOrMetadata ?? metadata;
        }
    }
}
export class CellErrorStackFrame {
    /**
     * @param label The name of the stack frame
     * @param file The file URI of the stack frame
     * @param position The position of the stack frame within the file
     */
    constructor(label, uri, position) {
        this.label = label;
        this.uri = uri;
        this.position = position;
    }
}
export var NotebookCellKind;
(function (NotebookCellKind) {
    NotebookCellKind[NotebookCellKind["Markup"] = 1] = "Markup";
    NotebookCellKind[NotebookCellKind["Code"] = 2] = "Code";
})(NotebookCellKind || (NotebookCellKind = {}));
export var NotebookCellExecutionState;
(function (NotebookCellExecutionState) {
    NotebookCellExecutionState[NotebookCellExecutionState["Idle"] = 1] = "Idle";
    NotebookCellExecutionState[NotebookCellExecutionState["Pending"] = 2] = "Pending";
    NotebookCellExecutionState[NotebookCellExecutionState["Executing"] = 3] = "Executing";
})(NotebookCellExecutionState || (NotebookCellExecutionState = {}));
export var NotebookCellStatusBarAlignment;
(function (NotebookCellStatusBarAlignment) {
    NotebookCellStatusBarAlignment[NotebookCellStatusBarAlignment["Left"] = 1] = "Left";
    NotebookCellStatusBarAlignment[NotebookCellStatusBarAlignment["Right"] = 2] = "Right";
})(NotebookCellStatusBarAlignment || (NotebookCellStatusBarAlignment = {}));
export var NotebookEditorRevealType;
(function (NotebookEditorRevealType) {
    NotebookEditorRevealType[NotebookEditorRevealType["Default"] = 0] = "Default";
    NotebookEditorRevealType[NotebookEditorRevealType["InCenter"] = 1] = "InCenter";
    NotebookEditorRevealType[NotebookEditorRevealType["InCenterIfOutsideViewport"] = 2] = "InCenterIfOutsideViewport";
    NotebookEditorRevealType[NotebookEditorRevealType["AtTop"] = 3] = "AtTop";
})(NotebookEditorRevealType || (NotebookEditorRevealType = {}));
export class NotebookCellStatusBarItem {
    constructor(text, alignment) {
        this.text = text;
        this.alignment = alignment;
    }
}
export var NotebookControllerAffinity;
(function (NotebookControllerAffinity) {
    NotebookControllerAffinity[NotebookControllerAffinity["Default"] = 1] = "Default";
    NotebookControllerAffinity[NotebookControllerAffinity["Preferred"] = 2] = "Preferred";
})(NotebookControllerAffinity || (NotebookControllerAffinity = {}));
export var NotebookControllerAffinity2;
(function (NotebookControllerAffinity2) {
    NotebookControllerAffinity2[NotebookControllerAffinity2["Default"] = 1] = "Default";
    NotebookControllerAffinity2[NotebookControllerAffinity2["Preferred"] = 2] = "Preferred";
    NotebookControllerAffinity2[NotebookControllerAffinity2["Hidden"] = -1] = "Hidden";
})(NotebookControllerAffinity2 || (NotebookControllerAffinity2 = {}));
export class NotebookRendererScript {
    constructor(uri, provides = []) {
        this.uri = uri;
        this.provides = asArray(provides);
    }
}
export class NotebookKernelSourceAction {
    constructor(label) {
        this.label = label;
    }
}
export var NotebookVariablesRequestKind;
(function (NotebookVariablesRequestKind) {
    NotebookVariablesRequestKind[NotebookVariablesRequestKind["Named"] = 1] = "Named";
    NotebookVariablesRequestKind[NotebookVariablesRequestKind["Indexed"] = 2] = "Indexed";
})(NotebookVariablesRequestKind || (NotebookVariablesRequestKind = {}));
//#endregion
//#region Timeline
let TimelineItem = class TimelineItem {
    constructor(label, timestamp) {
        this.label = label;
        this.timestamp = timestamp;
    }
};
TimelineItem = __decorate([
    es5ClassCompat
], TimelineItem);
export { TimelineItem };
//#endregion Timeline
//#region ExtensionContext
export var ExtensionMode;
(function (ExtensionMode) {
    /**
     * The extension is installed normally (for example, from the marketplace
     * or VSIX) in VS Code.
     */
    ExtensionMode[ExtensionMode["Production"] = 1] = "Production";
    /**
     * The extension is running from an `--extensionDevelopmentPath` provided
     * when launching VS Code.
     */
    ExtensionMode[ExtensionMode["Development"] = 2] = "Development";
    /**
     * The extension is running from an `--extensionDevelopmentPath` and
     * the extension host is running unit tests.
     */
    ExtensionMode[ExtensionMode["Test"] = 3] = "Test";
})(ExtensionMode || (ExtensionMode = {}));
export var ExtensionRuntime;
(function (ExtensionRuntime) {
    /**
     * The extension is running in a NodeJS extension host. Runtime access to NodeJS APIs is available.
     */
    ExtensionRuntime[ExtensionRuntime["Node"] = 1] = "Node";
    /**
     * The extension is running in a Webworker extension host. Runtime access is limited to Webworker APIs.
     */
    ExtensionRuntime[ExtensionRuntime["Webworker"] = 2] = "Webworker";
})(ExtensionRuntime || (ExtensionRuntime = {}));
//#endregion ExtensionContext
export var StandardTokenType;
(function (StandardTokenType) {
    StandardTokenType[StandardTokenType["Other"] = 0] = "Other";
    StandardTokenType[StandardTokenType["Comment"] = 1] = "Comment";
    StandardTokenType[StandardTokenType["String"] = 2] = "String";
    StandardTokenType[StandardTokenType["RegEx"] = 3] = "RegEx";
})(StandardTokenType || (StandardTokenType = {}));
export class LinkedEditingRanges {
    constructor(ranges, wordPattern) {
        this.ranges = ranges;
        this.wordPattern = wordPattern;
    }
}
//#region ports
export class PortAttributes {
    constructor(autoForwardAction) {
        this._autoForwardAction = autoForwardAction;
    }
    get autoForwardAction() {
        return this._autoForwardAction;
    }
}
//#endregion ports
//#region Testing
export var TestResultState;
(function (TestResultState) {
    TestResultState[TestResultState["Queued"] = 1] = "Queued";
    TestResultState[TestResultState["Running"] = 2] = "Running";
    TestResultState[TestResultState["Passed"] = 3] = "Passed";
    TestResultState[TestResultState["Failed"] = 4] = "Failed";
    TestResultState[TestResultState["Skipped"] = 5] = "Skipped";
    TestResultState[TestResultState["Errored"] = 6] = "Errored";
})(TestResultState || (TestResultState = {}));
export var TestRunProfileKind;
(function (TestRunProfileKind) {
    TestRunProfileKind[TestRunProfileKind["Run"] = 1] = "Run";
    TestRunProfileKind[TestRunProfileKind["Debug"] = 2] = "Debug";
    TestRunProfileKind[TestRunProfileKind["Coverage"] = 3] = "Coverage";
})(TestRunProfileKind || (TestRunProfileKind = {}));
export class TestRunProfileBase {
    constructor(controllerId, profileId, kind) {
        this.controllerId = controllerId;
        this.profileId = profileId;
        this.kind = kind;
    }
}
let TestRunRequest = class TestRunRequest {
    constructor(include = undefined, exclude = undefined, profile = undefined, continuous = false, preserveFocus = true) {
        this.include = include;
        this.exclude = exclude;
        this.profile = profile;
        this.continuous = continuous;
        this.preserveFocus = preserveFocus;
    }
};
TestRunRequest = __decorate([
    es5ClassCompat
], TestRunRequest);
export { TestRunRequest };
let TestMessage = TestMessage_1 = class TestMessage {
    static diff(message, expected, actual) {
        const msg = new TestMessage_1(message);
        msg.expectedOutput = expected;
        msg.actualOutput = actual;
        return msg;
    }
    constructor(message) {
        this.message = message;
    }
};
TestMessage = TestMessage_1 = __decorate([
    es5ClassCompat
], TestMessage);
export { TestMessage };
let TestTag = class TestTag {
    constructor(id) {
        this.id = id;
    }
};
TestTag = __decorate([
    es5ClassCompat
], TestTag);
export { TestTag };
export class TestMessageStackFrame {
    /**
     * @param label The name of the stack frame
     * @param file The file URI of the stack frame
     * @param position The position of the stack frame within the file
     */
    constructor(label, uri, position) {
        this.label = label;
        this.uri = uri;
        this.position = position;
    }
}
//#endregion
//#region Test Coverage
export class TestCoverageCount {
    constructor(covered, total) {
        this.covered = covered;
        this.total = total;
        validateTestCoverageCount(this);
    }
}
export function validateTestCoverageCount(cc) {
    if (!cc) {
        return;
    }
    if (cc.covered > cc.total) {
        throw new Error(`The total number of covered items (${cc.covered}) cannot be greater than the total (${cc.total})`);
    }
    if (cc.total < 0) {
        throw new Error(`The number of covered items (${cc.total}) cannot be negative`);
    }
}
export class FileCoverage {
    static fromDetails(uri, details) {
        const statements = new TestCoverageCount(0, 0);
        const branches = new TestCoverageCount(0, 0);
        const decl = new TestCoverageCount(0, 0);
        for (const detail of details) {
            if ('branches' in detail) {
                statements.total += 1;
                statements.covered += detail.executed ? 1 : 0;
                for (const branch of detail.branches) {
                    branches.total += 1;
                    branches.covered += branch.executed ? 1 : 0;
                }
            }
            else {
                decl.total += 1;
                decl.covered += detail.executed ? 1 : 0;
            }
        }
        const coverage = new FileCoverage(uri, statements, branches.total > 0 ? branches : undefined, decl.total > 0 ? decl : undefined);
        coverage.detailedCoverage = details;
        return coverage;
    }
    constructor(uri, statementCoverage, branchCoverage, declarationCoverage, includesTests = []) {
        this.uri = uri;
        this.statementCoverage = statementCoverage;
        this.branchCoverage = branchCoverage;
        this.declarationCoverage = declarationCoverage;
        this.includesTests = includesTests;
    }
}
export class StatementCoverage {
    // back compat until finalization:
    get executionCount() { return +this.executed; }
    set executionCount(n) { this.executed = n; }
    constructor(executed, location, branches = []) {
        this.executed = executed;
        this.location = location;
        this.branches = branches;
    }
}
export class BranchCoverage {
    // back compat until finalization:
    get executionCount() { return +this.executed; }
    set executionCount(n) { this.executed = n; }
    constructor(executed, location, label) {
        this.executed = executed;
        this.location = location;
        this.label = label;
    }
}
export class DeclarationCoverage {
    // back compat until finalization:
    get executionCount() { return +this.executed; }
    set executionCount(n) { this.executed = n; }
    constructor(name, executed, location) {
        this.name = name;
        this.executed = executed;
        this.location = location;
    }
}
//#endregion
export var ExternalUriOpenerPriority;
(function (ExternalUriOpenerPriority) {
    ExternalUriOpenerPriority[ExternalUriOpenerPriority["None"] = 0] = "None";
    ExternalUriOpenerPriority[ExternalUriOpenerPriority["Option"] = 1] = "Option";
    ExternalUriOpenerPriority[ExternalUriOpenerPriority["Default"] = 2] = "Default";
    ExternalUriOpenerPriority[ExternalUriOpenerPriority["Preferred"] = 3] = "Preferred";
})(ExternalUriOpenerPriority || (ExternalUriOpenerPriority = {}));
export var WorkspaceTrustState;
(function (WorkspaceTrustState) {
    WorkspaceTrustState[WorkspaceTrustState["Untrusted"] = 0] = "Untrusted";
    WorkspaceTrustState[WorkspaceTrustState["Trusted"] = 1] = "Trusted";
    WorkspaceTrustState[WorkspaceTrustState["Unspecified"] = 2] = "Unspecified";
})(WorkspaceTrustState || (WorkspaceTrustState = {}));
export var PortAutoForwardAction;
(function (PortAutoForwardAction) {
    PortAutoForwardAction[PortAutoForwardAction["Notify"] = 1] = "Notify";
    PortAutoForwardAction[PortAutoForwardAction["OpenBrowser"] = 2] = "OpenBrowser";
    PortAutoForwardAction[PortAutoForwardAction["OpenPreview"] = 3] = "OpenPreview";
    PortAutoForwardAction[PortAutoForwardAction["Silent"] = 4] = "Silent";
    PortAutoForwardAction[PortAutoForwardAction["Ignore"] = 5] = "Ignore";
    PortAutoForwardAction[PortAutoForwardAction["OpenBrowserOnce"] = 6] = "OpenBrowserOnce";
})(PortAutoForwardAction || (PortAutoForwardAction = {}));
export class TypeHierarchyItem {
    constructor(kind, name, detail, uri, range, selectionRange) {
        this.kind = kind;
        this.name = name;
        this.detail = detail;
        this.uri = uri;
        this.range = range;
        this.selectionRange = selectionRange;
    }
}
//#region Tab Inputs
export class TextTabInput {
    constructor(uri) {
        this.uri = uri;
    }
}
export class TextDiffTabInput {
    constructor(original, modified) {
        this.original = original;
        this.modified = modified;
    }
}
export class TextMergeTabInput {
    constructor(base, input1, input2, result) {
        this.base = base;
        this.input1 = input1;
        this.input2 = input2;
        this.result = result;
    }
}
export class CustomEditorTabInput {
    constructor(uri, viewType) {
        this.uri = uri;
        this.viewType = viewType;
    }
}
export class WebviewEditorTabInput {
    constructor(viewType) {
        this.viewType = viewType;
    }
}
export class NotebookEditorTabInput {
    constructor(uri, notebookType) {
        this.uri = uri;
        this.notebookType = notebookType;
    }
}
export class NotebookDiffEditorTabInput {
    constructor(original, modified, notebookType) {
        this.original = original;
        this.modified = modified;
        this.notebookType = notebookType;
    }
}
export class TerminalEditorTabInput {
    constructor() { }
}
export class InteractiveWindowInput {
    constructor(uri, inputBoxUri) {
        this.uri = uri;
        this.inputBoxUri = inputBoxUri;
    }
}
export class ChatEditorTabInput {
    constructor() { }
}
export class TextMultiDiffTabInput {
    constructor(textDiffs) {
        this.textDiffs = textDiffs;
    }
}
//#endregion
//#region Chat
export var InteractiveSessionVoteDirection;
(function (InteractiveSessionVoteDirection) {
    InteractiveSessionVoteDirection[InteractiveSessionVoteDirection["Down"] = 0] = "Down";
    InteractiveSessionVoteDirection[InteractiveSessionVoteDirection["Up"] = 1] = "Up";
})(InteractiveSessionVoteDirection || (InteractiveSessionVoteDirection = {}));
export var ChatCopyKind;
(function (ChatCopyKind) {
    ChatCopyKind[ChatCopyKind["Action"] = 1] = "Action";
    ChatCopyKind[ChatCopyKind["Toolbar"] = 2] = "Toolbar";
})(ChatCopyKind || (ChatCopyKind = {}));
export var ChatVariableLevel;
(function (ChatVariableLevel) {
    ChatVariableLevel[ChatVariableLevel["Short"] = 1] = "Short";
    ChatVariableLevel[ChatVariableLevel["Medium"] = 2] = "Medium";
    ChatVariableLevel[ChatVariableLevel["Full"] = 3] = "Full";
})(ChatVariableLevel || (ChatVariableLevel = {}));
export class ChatCompletionItem {
    constructor(id, label, values) {
        this.id = id;
        this.label = label;
        this.values = values;
    }
}
export var ChatEditingSessionActionOutcome;
(function (ChatEditingSessionActionOutcome) {
    ChatEditingSessionActionOutcome[ChatEditingSessionActionOutcome["Accepted"] = 1] = "Accepted";
    ChatEditingSessionActionOutcome[ChatEditingSessionActionOutcome["Rejected"] = 2] = "Rejected";
    ChatEditingSessionActionOutcome[ChatEditingSessionActionOutcome["Saved"] = 3] = "Saved";
})(ChatEditingSessionActionOutcome || (ChatEditingSessionActionOutcome = {}));
//#endregion
//#region Interactive Editor
export var InteractiveEditorResponseFeedbackKind;
(function (InteractiveEditorResponseFeedbackKind) {
    InteractiveEditorResponseFeedbackKind[InteractiveEditorResponseFeedbackKind["Unhelpful"] = 0] = "Unhelpful";
    InteractiveEditorResponseFeedbackKind[InteractiveEditorResponseFeedbackKind["Helpful"] = 1] = "Helpful";
    InteractiveEditorResponseFeedbackKind[InteractiveEditorResponseFeedbackKind["Undone"] = 2] = "Undone";
    InteractiveEditorResponseFeedbackKind[InteractiveEditorResponseFeedbackKind["Accepted"] = 3] = "Accepted";
    InteractiveEditorResponseFeedbackKind[InteractiveEditorResponseFeedbackKind["Bug"] = 4] = "Bug";
})(InteractiveEditorResponseFeedbackKind || (InteractiveEditorResponseFeedbackKind = {}));
export var ChatResultFeedbackKind;
(function (ChatResultFeedbackKind) {
    ChatResultFeedbackKind[ChatResultFeedbackKind["Unhelpful"] = 0] = "Unhelpful";
    ChatResultFeedbackKind[ChatResultFeedbackKind["Helpful"] = 1] = "Helpful";
})(ChatResultFeedbackKind || (ChatResultFeedbackKind = {}));
export class ChatResponseMarkdownPart {
    constructor(value) {
        if (typeof value !== 'string' && value.isTrusted === true) {
            throw new Error('The boolean form of MarkdownString.isTrusted is NOT supported for chat participants.');
        }
        this.value = typeof value === 'string' ? new MarkdownString(value) : value;
    }
}
/**
 * TODO if 'vulnerabilities' is finalized, this should be merged with the base ChatResponseMarkdownPart. I just don't see how to do that while keeping
 * vulnerabilities in a seperate API proposal in a clean way.
 */
export class ChatResponseMarkdownWithVulnerabilitiesPart {
    constructor(value, vulnerabilities) {
        if (typeof value !== 'string' && value.isTrusted === true) {
            throw new Error('The boolean form of MarkdownString.isTrusted is NOT supported for chat participants.');
        }
        this.value = typeof value === 'string' ? new MarkdownString(value) : value;
        this.vulnerabilities = vulnerabilities;
    }
}
export class ChatResponseConfirmationPart {
    constructor(title, message, data, buttons) {
        this.title = title;
        this.message = message;
        this.data = data;
        this.buttons = buttons;
    }
}
export class ChatResponseFileTreePart {
    constructor(value, baseUri) {
        this.value = value;
        this.baseUri = baseUri;
    }
}
export class ChatResponseAnchorPart {
    constructor(value, title) {
        this.value = value;
        this.value2 = value;
        this.title = title;
    }
}
export class ChatResponseProgressPart {
    constructor(value) {
        this.value = value;
    }
}
export class ChatResponseProgressPart2 {
    constructor(value, task) {
        this.value = value;
        this.task = task;
    }
}
export class ChatResponseWarningPart {
    constructor(value) {
        if (typeof value !== 'string' && value.isTrusted === true) {
            throw new Error('The boolean form of MarkdownString.isTrusted is NOT supported for chat participants.');
        }
        this.value = typeof value === 'string' ? new MarkdownString(value) : value;
    }
}
export class ChatResponseCommandButtonPart {
    constructor(value) {
        this.value = value;
    }
}
export class ChatResponseReferencePart {
    constructor(value, iconPath, options) {
        this.value = value;
        this.iconPath = iconPath;
        this.options = options;
    }
}
export class ChatResponseCodeblockUriPart {
    constructor(value, isEdit) {
        this.value = value;
        this.isEdit = isEdit;
    }
}
export class ChatResponseCodeCitationPart {
    constructor(value, license, snippet) {
        this.value = value;
        this.license = license;
        this.snippet = snippet;
    }
}
export class ChatResponseMovePart {
    constructor(uri, range) {
        this.uri = uri;
        this.range = range;
    }
}
export class ChatResponseTextEditPart {
    constructor(uri, editsOrDone) {
        this.uri = uri;
        if (editsOrDone === true) {
            this.isDone = true;
            this.edits = [];
        }
        else {
            this.edits = Array.isArray(editsOrDone) ? editsOrDone : [editsOrDone];
        }
    }
}
export class ChatResponseNotebookEditPart {
    constructor(uri, editsOrDone) {
        this.uri = uri;
        if (editsOrDone === true) {
            this.isDone = true;
            this.edits = [];
        }
        else {
            this.edits = Array.isArray(editsOrDone) ? editsOrDone : [editsOrDone];
        }
    }
}
export class ChatRequestTurn {
    constructor(prompt, command, references, participant, toolReferences) {
        this.prompt = prompt;
        this.command = command;
        this.references = references;
        this.participant = participant;
        this.toolReferences = toolReferences;
    }
}
export class ChatResponseTurn {
    constructor(response, result, participant, command) {
        this.response = response;
        this.result = result;
        this.participant = participant;
        this.command = command;
    }
}
export var ChatLocation;
(function (ChatLocation) {
    ChatLocation[ChatLocation["Panel"] = 1] = "Panel";
    ChatLocation[ChatLocation["Terminal"] = 2] = "Terminal";
    ChatLocation[ChatLocation["Notebook"] = 3] = "Notebook";
    ChatLocation[ChatLocation["Editor"] = 4] = "Editor";
    ChatLocation[ChatLocation["EditingSession"] = 5] = "EditingSession";
})(ChatLocation || (ChatLocation = {}));
export var ChatResponseReferencePartStatusKind;
(function (ChatResponseReferencePartStatusKind) {
    ChatResponseReferencePartStatusKind[ChatResponseReferencePartStatusKind["Complete"] = 1] = "Complete";
    ChatResponseReferencePartStatusKind[ChatResponseReferencePartStatusKind["Partial"] = 2] = "Partial";
    ChatResponseReferencePartStatusKind[ChatResponseReferencePartStatusKind["Omitted"] = 3] = "Omitted";
})(ChatResponseReferencePartStatusKind || (ChatResponseReferencePartStatusKind = {}));
export class ChatRequestEditorData {
    constructor(document, selection, wholeRange) {
        this.document = document;
        this.selection = selection;
        this.wholeRange = wholeRange;
    }
}
export class ChatRequestNotebookData {
    constructor(cell) {
        this.cell = cell;
    }
}
export class ChatReferenceBinaryData {
    constructor(mimeType, data, reference) {
        this.mimeType = mimeType;
        this.data = data;
        this.reference = reference;
    }
}
export class ChatReferenceDiagnostic {
    constructor(diagnostics) {
        this.diagnostics = diagnostics;
    }
}
export var LanguageModelChatMessageRole;
(function (LanguageModelChatMessageRole) {
    LanguageModelChatMessageRole[LanguageModelChatMessageRole["User"] = 1] = "User";
    LanguageModelChatMessageRole[LanguageModelChatMessageRole["Assistant"] = 2] = "Assistant";
    LanguageModelChatMessageRole[LanguageModelChatMessageRole["System"] = 3] = "System";
})(LanguageModelChatMessageRole || (LanguageModelChatMessageRole = {}));
export class LanguageModelToolResultPart {
    constructor(callId, content, isError) {
        this.callId = callId;
        this.content = content;
        this.isError = isError ?? false;
    }
}
export class PreparedTerminalToolInvocation {
    constructor(command, language, confirmationMessages) {
        this.command = command;
        this.language = language;
        this.confirmationMessages = confirmationMessages;
    }
}
export var ChatErrorLevel;
(function (ChatErrorLevel) {
    ChatErrorLevel[ChatErrorLevel["Info"] = 0] = "Info";
    ChatErrorLevel[ChatErrorLevel["Warning"] = 1] = "Warning";
    ChatErrorLevel[ChatErrorLevel["Error"] = 2] = "Error";
})(ChatErrorLevel || (ChatErrorLevel = {}));
export class LanguageModelChatMessage {
    static User(content, name) {
        return new LanguageModelChatMessage(LanguageModelChatMessageRole.User, content, name);
    }
    static Assistant(content, name) {
        return new LanguageModelChatMessage(LanguageModelChatMessageRole.Assistant, content, name);
    }
    set content(value) {
        if (typeof value === 'string') {
            // we changed this and still support setting content with a string property. this keep the API runtime stable
            // despite the breaking change in the type definition.
            this._content = [new LanguageModelTextPart(value)];
        }
        else {
            this._content = value;
        }
    }
    get content() {
        return this._content;
    }
    // Temp to avoid breaking changes
    set content2(value) {
        if (value) {
            this.content = value.map(part => {
                if (typeof part === 'string') {
                    return new LanguageModelTextPart(part);
                }
                return part;
            });
        }
    }
    get content2() {
        return this.content.map(part => {
            if (part instanceof LanguageModelTextPart) {
                return part.value;
            }
            return part;
        });
    }
    constructor(role, content, name) {
        this._content = [];
        this.role = role;
        this.content = content;
        this.name = name;
    }
}
export class LanguageModelChatMessage2 {
    static User(content, name) {
        return new LanguageModelChatMessage2(LanguageModelChatMessageRole.User, content, name);
    }
    static Assistant(content, name) {
        return new LanguageModelChatMessage2(LanguageModelChatMessageRole.Assistant, content, name);
    }
    set content(value) {
        if (typeof value === 'string') {
            // we changed this and still support setting content with a string property. this keep the API runtime stable
            // despite the breaking change in the type definition.
            this._content = [new LanguageModelTextPart(value)];
        }
        else {
            this._content = value;
        }
    }
    get content() {
        return this._content;
    }
    // Temp to avoid breaking changes
    set content2(value) {
        if (value) {
            this.content = value.map(part => {
                if (typeof part === 'string') {
                    return new LanguageModelTextPart(part);
                }
                return part;
            });
        }
    }
    get content2() {
        return this.content.map(part => {
            if (part instanceof LanguageModelTextPart) {
                return part.value;
            }
            return part;
        });
    }
    constructor(role, content, name) {
        this._content = [];
        this.role = role;
        this.content = content;
        this.name = name;
    }
}
export class LanguageModelToolCallPart {
    constructor(callId, name, input) {
        this.callId = callId;
        this.name = name;
        this.input = input;
    }
}
export class LanguageModelTextPart {
    constructor(value) {
        this.value = value;
    }
    toJSON() {
        return {
            $mid: 21 /* MarshalledId.LanguageModelTextPart */,
            value: this.value,
        };
    }
}
export class LanguageModelDataPart {
    constructor(value) {
        this.value = value;
    }
    toJSON() {
        return {
            $mid: 23 /* MarshalledId.LanguageModelDataPart */,
            value: this.value,
        };
    }
}
/**
 * Enum for supported image MIME types.
 */
export var ChatImageMimeType;
(function (ChatImageMimeType) {
    ChatImageMimeType["PNG"] = "image/png";
    ChatImageMimeType["JPEG"] = "image/jpeg";
    ChatImageMimeType["GIF"] = "image/gif";
    ChatImageMimeType["WEBP"] = "image/webp";
    ChatImageMimeType["BMP"] = "image/bmp";
})(ChatImageMimeType || (ChatImageMimeType = {}));
export class LanguageModelPromptTsxPart {
    constructor(value) {
        this.value = value;
    }
    toJSON() {
        return {
            $mid: 22 /* MarshalledId.LanguageModelPromptTsxPart */,
            value: this.value,
        };
    }
}
/**
 * @deprecated
 */
export class LanguageModelChatSystemMessage {
    constructor(content) {
        this.content = content;
    }
}
/**
 * @deprecated
 */
export class LanguageModelChatUserMessage {
    constructor(content, name) {
        this.content = content;
        this.name = name;
    }
}
/**
 * @deprecated
 */
export class LanguageModelChatAssistantMessage {
    constructor(content, name) {
        this.content = content;
        this.name = name;
    }
}
export class LanguageModelError extends Error {
    static #name = 'LanguageModelError';
    static NotFound(message) {
        return new LanguageModelError(message, LanguageModelError.NotFound.name);
    }
    static NoPermissions(message) {
        return new LanguageModelError(message, LanguageModelError.NoPermissions.name);
    }
    static Blocked(message) {
        return new LanguageModelError(message, LanguageModelError.Blocked.name);
    }
    static tryDeserialize(data) {
        if (data.name !== LanguageModelError.#name) {
            return undefined;
        }
        return new LanguageModelError(data.message, data.code, data.cause);
    }
    constructor(message, code, cause) {
        super(message, { cause });
        this.name = LanguageModelError.#name;
        this.code = code ?? '';
    }
}
export class LanguageModelToolResult {
    constructor(content) {
        this.content = content;
    }
    toJSON() {
        return {
            $mid: 20 /* MarshalledId.LanguageModelToolResult */,
            content: this.content,
        };
    }
}
export class ExtendedLanguageModelToolResult extends LanguageModelToolResult {
}
export var LanguageModelChatToolMode;
(function (LanguageModelChatToolMode) {
    LanguageModelChatToolMode[LanguageModelChatToolMode["Auto"] = 1] = "Auto";
    LanguageModelChatToolMode[LanguageModelChatToolMode["Required"] = 2] = "Required";
})(LanguageModelChatToolMode || (LanguageModelChatToolMode = {}));
//#endregion
//#region ai
export var RelatedInformationType;
(function (RelatedInformationType) {
    RelatedInformationType[RelatedInformationType["SymbolInformation"] = 1] = "SymbolInformation";
    RelatedInformationType[RelatedInformationType["CommandInformation"] = 2] = "CommandInformation";
    RelatedInformationType[RelatedInformationType["SearchInformation"] = 3] = "SearchInformation";
    RelatedInformationType[RelatedInformationType["SettingInformation"] = 4] = "SettingInformation";
})(RelatedInformationType || (RelatedInformationType = {}));
//#endregion
//#region Speech
export var SpeechToTextStatus;
(function (SpeechToTextStatus) {
    SpeechToTextStatus[SpeechToTextStatus["Started"] = 1] = "Started";
    SpeechToTextStatus[SpeechToTextStatus["Recognizing"] = 2] = "Recognizing";
    SpeechToTextStatus[SpeechToTextStatus["Recognized"] = 3] = "Recognized";
    SpeechToTextStatus[SpeechToTextStatus["Stopped"] = 4] = "Stopped";
    SpeechToTextStatus[SpeechToTextStatus["Error"] = 5] = "Error";
})(SpeechToTextStatus || (SpeechToTextStatus = {}));
export var TextToSpeechStatus;
(function (TextToSpeechStatus) {
    TextToSpeechStatus[TextToSpeechStatus["Started"] = 1] = "Started";
    TextToSpeechStatus[TextToSpeechStatus["Stopped"] = 2] = "Stopped";
    TextToSpeechStatus[TextToSpeechStatus["Error"] = 3] = "Error";
})(TextToSpeechStatus || (TextToSpeechStatus = {}));
export var KeywordRecognitionStatus;
(function (KeywordRecognitionStatus) {
    KeywordRecognitionStatus[KeywordRecognitionStatus["Recognized"] = 1] = "Recognized";
    KeywordRecognitionStatus[KeywordRecognitionStatus["Stopped"] = 2] = "Stopped";
})(KeywordRecognitionStatus || (KeywordRecognitionStatus = {}));
//#endregion
//#region InlineEdit
export class InlineEdit {
    constructor(text, range) {
        this.text = text;
        this.range = range;
    }
}
export var InlineEditTriggerKind;
(function (InlineEditTriggerKind) {
    InlineEditTriggerKind[InlineEditTriggerKind["Invoke"] = 0] = "Invoke";
    InlineEditTriggerKind[InlineEditTriggerKind["Automatic"] = 1] = "Automatic";
})(InlineEditTriggerKind || (InlineEditTriggerKind = {}));
//#endregion
//#region MC
export class McpStdioServerDefinition {
    constructor(label, command, args, env) {
        this.label = label;
        this.command = command;
        this.args = args;
        this.env = env;
    }
}
export class McpSSEServerDefinition {
    constructor(label, uri) {
        this.label = label;
        this.uri = uri;
        this.headers = [];
    }
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFR5cGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RUeXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7QUFLaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFbEYsT0FBTyxFQUFFLGVBQWUsRUFBbUIsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVsRixPQUFPLEVBQUUsY0FBYyxJQUFJLGtCQUFrQixFQUFnQyxNQUFNLHFDQUFxQyxDQUFDO0FBQ3pILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUUxRCxPQUFPLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDeEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUM1RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRTVELE9BQU8sRUFBRSxtQkFBbUIsRUFBeUIsTUFBTSxtREFBbUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNySCxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM5RyxPQUFPLEVBQTBELGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFHM0k7Ozs7O0tBS0s7QUFDTCxTQUFTLGNB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