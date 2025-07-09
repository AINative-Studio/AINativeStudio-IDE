/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ok } from '../../../base/common/assert.js';
import { ReadonlyError, illegalArgument } from '../../../base/common/errors.js';
import { IdGenerator } from '../../../base/common/idGenerator.js';
import * as TypeConverters from './extHostTypeConverters.js';
import { EndOfLine, Position, Range, Selection, TextEditorRevealType } from './extHostTypes.js';
export class TextEditorDecorationType {
    static { this._Keys = new IdGenerator('TextEditorDecorationType'); }
    constructor(proxy, extension, options) {
        const key = TextEditorDecorationType._Keys.nextId();
        proxy.$registerTextEditorDecorationType(extension.identifier, key, TypeConverters.DecorationRenderOptions.from(options));
        this.value = Object.freeze({
            key,
            dispose() {
                proxy.$removeTextEditorDecorationType(key);
            }
        });
    }
}
class TextEditorEdit {
    constructor(document, options) {
        this._collectedEdits = [];
        this._setEndOfLine = undefined;
        this._finalized = false;
        this._document = document;
        this._documentVersionId = document.version;
        this._undoStopBefore = options.undoStopBefore;
        this._undoStopAfter = options.undoStopAfter;
    }
    finalize() {
        this._finalized = true;
        return {
            documentVersionId: this._documentVersionId,
            edits: this._collectedEdits,
            setEndOfLine: this._setEndOfLine,
            undoStopBefore: this._undoStopBefore,
            undoStopAfter: this._undoStopAfter
        };
    }
    _throwIfFinalized() {
        if (this._finalized) {
            throw new Error('Edit is only valid while callback runs');
        }
    }
    replace(location, value) {
        this._throwIfFinalized();
        let range = null;
        if (location instanceof Position) {
            range = new Range(location, location);
        }
        else if (location instanceof Range) {
            range = location;
        }
        else {
            throw new Error('Unrecognized location');
        }
        this._pushEdit(range, value, false);
    }
    insert(location, value) {
        this._throwIfFinalized();
        this._pushEdit(new Range(location, location), value, true);
    }
    delete(location) {
        this._throwIfFinalized();
        let range = null;
        if (location instanceof Range) {
            range = location;
        }
        else {
            throw new Error('Unrecognized location');
        }
        this._pushEdit(range, null, true);
    }
    _pushEdit(range, text, forceMoveMarkers) {
        const validRange = this._document.validateRange(range);
        this._collectedEdits.push({
            range: validRange,
            text: text,
            forceMoveMarkers: forceMoveMarkers
        });
    }
    setEndOfLine(endOfLine) {
        this._throwIfFinalized();
        if (endOfLine !== EndOfLine.LF && endOfLine !== EndOfLine.CRLF) {
            throw illegalArgument('endOfLine');
        }
        this._setEndOfLine = endOfLine;
    }
}
export class ExtHostTextEditorOptions {
    constructor(proxy, id, source, logService) {
        this._proxy = proxy;
        this._id = id;
        this._accept(source);
        this._logService = logService;
        const that = this;
        this.value = {
            get tabSize() {
                return that._tabSize;
            },
            set tabSize(value) {
                that._setTabSize(value);
            },
            get indentSize() {
                return that._indentSize;
            },
            set indentSize(value) {
                that._setIndentSize(value);
            },
            get insertSpaces() {
                return that._insertSpaces;
            },
            set insertSpaces(value) {
                that._setInsertSpaces(value);
            },
            get cursorStyle() {
                return that._cursorStyle;
            },
            set cursorStyle(value) {
                that._setCursorStyle(value);
            },
            get lineNumbers() {
                return that._lineNumbers;
            },
            set lineNumbers(value) {
                that._setLineNumbers(value);
            }
        };
    }
    _accept(source) {
        this._tabSize = source.tabSize;
        this._indentSize = source.indentSize;
        this._originalIndentSize = source.originalIndentSize;
        this._insertSpaces = source.insertSpaces;
        this._cursorStyle = source.cursorStyle;
        this._lineNumbers = TypeConverters.TextEditorLineNumbersStyle.to(source.lineNumbers);
    }
    // --- internal: tabSize
    _validateTabSize(value) {
        if (value === 'auto') {
            return 'auto';
        }
        if (typeof value === 'number') {
            const r = Math.floor(value);
            return (r > 0 ? r : null);
        }
        if (typeof value === 'string') {
            const r = parseInt(value, 10);
            if (isNaN(r)) {
                return null;
            }
            return (r > 0 ? r : null);
        }
        return null;
    }
    _setTabSize(value) {
        const tabSize = this._validateTabSize(value);
        if (tabSize === null) {
            // ignore invalid call
            return;
        }
        if (typeof tabSize === 'number') {
            if (this._tabSize === tabSize) {
                // nothing to do
                return;
            }
            // reflect the new tabSize value immediately
            this._tabSize = tabSize;
        }
        this._warnOnError('setTabSize', this._proxy.$trySetOptions(this._id, {
            tabSize: tabSize
        }));
    }
    // --- internal: indentSize
    _validateIndentSize(value) {
        if (value === 'tabSize') {
            return 'tabSize';
        }
        if (typeof value === 'number') {
            const r = Math.floor(value);
            return (r > 0 ? r : null);
        }
        if (typeof value === 'string') {
            const r = parseInt(value, 10);
            if (isNaN(r)) {
                return null;
            }
            return (r > 0 ? r : null);
        }
        return null;
    }
    _setIndentSize(value) {
        const indentSize = this._validateIndentSize(value);
        if (indentSize === null) {
            // ignore invalid call
            return;
        }
        if (typeof indentSize === 'number') {
            if (this._originalIndentSize === indentSize) {
                // nothing to do
                return;
            }
            // reflect the new indentSize value immediately
            this._indentSize = indentSize;
            this._originalIndentSize = indentSize;
        }
        this._warnOnError('setIndentSize', this._proxy.$trySetOptions(this._id, {
            indentSize: indentSize
        }));
    }
    // --- internal: insert spaces
    _validateInsertSpaces(value) {
        if (value === 'auto') {
            return 'auto';
        }
        return (value === 'false' ? false : Boolean(value));
    }
    _setInsertSpaces(value) {
        const insertSpaces = this._validateInsertSpaces(value);
        if (typeof insertSpaces === 'boolean') {
            if (this._insertSpaces === insertSpaces) {
                // nothing to do
                return;
            }
            // reflect the new insertSpaces value immediately
            this._insertSpaces = insertSpaces;
        }
        this._warnOnError('setInsertSpaces', this._proxy.$trySetOptions(this._id, {
            insertSpaces: insertSpaces
        }));
    }
    // --- internal: cursor style
    _setCursorStyle(value) {
        if (this._cursorStyle === value) {
            // nothing to do
            return;
        }
        this._cursorStyle = value;
        this._warnOnError('setCursorStyle', this._proxy.$trySetOptions(this._id, {
            cursorStyle: value
        }));
    }
    // --- internal: line number
    _setLineNumbers(value) {
        if (this._lineNumbers === value) {
            // nothing to do
            return;
        }
        this._lineNumbers = value;
        this._warnOnError('setLineNumbers', this._proxy.$trySetOptions(this._id, {
            lineNumbers: TypeConverters.TextEditorLineNumbersStyle.from(value)
        }));
    }
    assign(newOptions) {
        const bulkConfigurationUpdate = {};
        let hasUpdate = false;
        if (typeof newOptions.tabSize !== 'undefined') {
            const tabSize = this._validateTabSize(newOptions.tabSize);
            if (tabSize === 'auto') {
                hasUpdate = true;
                bulkConfigurationUpdate.tabSize = tabSize;
            }
            else if (typeof tabSize === 'number' && this._tabSize !== tabSize) {
                // reflect the new tabSize value immediately
                this._tabSize = tabSize;
                hasUpdate = true;
                bulkConfigurationUpdate.tabSize = tabSize;
            }
        }
        if (typeof newOptions.indentSize !== 'undefined') {
            const indentSize = this._validateIndentSize(newOptions.indentSize);
            if (indentSize === 'tabSize') {
                hasUpdate = true;
                bulkConfigurationUpdate.indentSize = indentSize;
            }
            else if (typeof indentSize === 'number' && this._originalIndentSize !== indentSize) {
                // reflect the new indentSize value immediately
                this._indentSize = indentSize;
                this._originalIndentSize = indentSize;
                hasUpdate = true;
                bulkConfigurationUpdate.indentSize = indentSize;
            }
        }
        if (typeof newOptions.insertSpaces !== 'undefined') {
            const insertSpaces = this._validateInsertSpaces(newOptions.insertSpaces);
            if (insertSpaces === 'auto') {
                hasUpdate = true;
                bulkConfigurationUpdate.insertSpaces = insertSpaces;
            }
            else if (this._insertSpaces !== insertSpaces) {
                // reflect the new insertSpaces value immediately
                this._insertSpaces = insertSpaces;
                hasUpdate = true;
                bulkConfigurationUpdate.insertSpaces = insertSpaces;
            }
        }
        if (typeof newOptions.cursorStyle !== 'undefined') {
            if (this._cursorStyle !== newOptions.cursorStyle) {
                this._cursorStyle = newOptions.cursorStyle;
                hasUpdate = true;
                bulkConfigurationUpdate.cursorStyle = newOptions.cursorStyle;
            }
        }
        if (typeof newOptions.lineNumbers !== 'undefined') {
            if (this._lineNumbers !== newOptions.lineNumbers) {
                this._lineNumbers = newOptions.lineNumbers;
                hasUpdate = true;
                bulkConfigurationUpdate.lineNumbers = TypeConverters.TextEditorLineNumbersStyle.from(newOptions.lineNumbers);
            }
        }
        if (hasUpdate) {
            this._warnOnError('setOptions', this._proxy.$trySetOptions(this._id, bulkConfigurationUpdate));
        }
    }
    _warnOnError(action, promise) {
        promise.catch(err => {
            this._logService.warn(`ExtHostTextEditorOptions '${action}' failed:'`);
            this._logService.warn(err);
        });
    }
}
export class ExtHostTextEditor {
    constructor(id, _proxy, _logService, document, selections, options, visibleRanges, viewColumn) {
        this.id = id;
        this._proxy = _proxy;
        this._logService = _logService;
        this._disposed = false;
        this._hasDecorationsForKey = new Set();
        this._selections = selections;
        this._options = new ExtHostTextEditorOptions(this._proxy, this.id, options, _logService);
        this._visibleRanges = visibleRanges;
        this._viewColumn = viewColumn;
        const that = this;
        this.value = Object.freeze({
            get document() {
                return document.value;
            },
            set document(_value) {
                throw new ReadonlyError('document');
            },
            // --- selection
            get selection() {
                return that._selections && that._selections[0];
            },
            set selection(value) {
                if (!(value instanceof Selection)) {
                    throw illegalArgument('selection');
                }
                that._selections = [value];
                that._trySetSelection();
            },
            get selections() {
                return that._selections;
            },
            set selections(value) {
                if (!Array.isArray(value) || value.some(a => !(a instanceof Selection))) {
                    throw illegalArgument('selections');
                }
                that._selections = value;
                that._trySetSelection();
            },
            // --- visible ranges
            get visibleRanges() {
                return that._visibleRanges;
            },
            set visibleRanges(_value) {
                throw new ReadonlyError('visibleRanges');
            },
            get diffInformation() {
                return that._diffInformation;
            },
            // --- options
            get options() {
                return that._options.value;
            },
            set options(value) {
                if (!that._disposed) {
                    that._options.assign(value);
                }
            },
            // --- view column
            get viewColumn() {
                return that._viewColumn;
            },
            set viewColumn(_value) {
                throw new ReadonlyError('viewColumn');
            },
            // --- edit
            edit(callback, options = { undoStopBefore: true, undoStopAfter: true }) {
                if (that._disposed) {
                    return Promise.reject(new Error('TextEditor#edit not possible on closed editors'));
                }
                const edit = new TextEditorEdit(document.value, options);
                callback(edit);
                return that._applyEdit(edit);
            },
            // --- snippet edit
            insertSnippet(snippet, where, options = { undoStopBefore: true, undoStopAfter: true }) {
                if (that._disposed) {
                    return Promise.reject(new Error('TextEditor#insertSnippet not possible on closed editors'));
                }
                let ranges;
                if (!where || (Array.isArray(where) && where.length === 0)) {
                    ranges = that._selections.map(range => TypeConverters.Range.from(range));
                }
                else if (where instanceof Position) {
                    const { lineNumber, column } = TypeConverters.Position.from(where);
                    ranges = [{ startLineNumber: lineNumber, startColumn: column, endLineNumber: lineNumber, endColumn: column }];
                }
                else if (where instanceof Range) {
                    ranges = [TypeConverters.Range.from(where)];
                }
                else {
                    ranges = [];
                    for (const posOrRange of where) {
                        if (posOrRange instanceof Range) {
                            ranges.push(TypeConverters.Range.from(posOrRange));
                        }
                        else {
                            const { lineNumber, column } = TypeConverters.Position.from(posOrRange);
                            ranges.push({ startLineNumber: lineNumber, startColumn: column, endLineNumber: lineNumber, endColumn: column });
                        }
                    }
                }
                if (options.keepWhitespace === undefined) {
                    options.keepWhitespace = false;
                }
                return _proxy.$tryInsertSnippet(id, document.value.version, snippet.value, ranges, options);
            },
            setDecorations(decorationType, ranges) {
                const willBeEmpty = (ranges.length === 0);
                if (willBeEmpty && !that._hasDecorationsForKey.has(decorationType.key)) {
                    // avoid no-op call to the renderer
                    return;
                }
                if (willBeEmpty) {
                    that._hasDecorationsForKey.delete(decorationType.key);
                }
                else {
                    that._hasDecorationsForKey.add(decorationType.key);
                }
                that._runOnProxy(() => {
                    if (TypeConverters.isDecorationOptionsArr(ranges)) {
                        return _proxy.$trySetDecorations(id, decorationType.key, TypeConverters.fromRangeOrRangeWithMessage(ranges));
                    }
                    else {
                        const _ranges = new Array(4 * ranges.length);
                        for (let i = 0, len = ranges.length; i < len; i++) {
                            const range = ranges[i];
                            _ranges[4 * i] = range.start.line + 1;
                            _ranges[4 * i + 1] = range.start.character + 1;
                            _ranges[4 * i + 2] = range.end.line + 1;
                            _ranges[4 * i + 3] = range.end.character + 1;
                        }
                        return _proxy.$trySetDecorationsFast(id, decorationType.key, _ranges);
                    }
                });
            },
            revealRange(range, revealType) {
                that._runOnProxy(() => _proxy.$tryRevealRange(id, TypeConverters.Range.from(range), (revealType || TextEditorRevealType.Default)));
            },
            show(column) {
                _proxy.$tryShowEditor(id, TypeConverters.ViewColumn.from(column));
            },
            hide() {
                _proxy.$tryHideEditor(id);
            },
            [Symbol.for('debug.description')]() {
                return `TextEditor(${this.document.uri.toString()})`;
            }
        });
    }
    dispose() {
        ok(!this._disposed);
        this._disposed = true;
    }
    // --- incoming: extension host MUST accept what the renderer says
    _acceptOptions(options) {
        ok(!this._disposed);
        this._options._accept(options);
    }
    _acceptVisibleRanges(value) {
        ok(!this._disposed);
        this._visibleRanges = value;
    }
    _acceptViewColumn(value) {
        ok(!this._disposed);
        this._viewColumn = value;
    }
    _acceptSelections(selections) {
        ok(!this._disposed);
        this._selections = selections;
    }
    _acceptDiffInformation(diffInformation) {
        ok(!this._disposed);
        this._diffInformation = diffInformation;
    }
    async _trySetSelection() {
        const selection = this._selections.map(TypeConverters.Selection.from);
        await this._runOnProxy(() => this._proxy.$trySetSelections(this.id, selection));
        return this.value;
    }
    _applyEdit(editBuilder) {
        const editData = editBuilder.finalize();
        // return when there is nothing to do
        if (editData.edits.length === 0 && !editData.setEndOfLine) {
            return Promise.resolve(true);
        }
        // check that the edits are not overlapping (i.e. illegal)
        const editRanges = editData.edits.map(edit => edit.range);
        // sort ascending (by end and then by start)
        editRanges.sort((a, b) => {
            if (a.end.line === b.end.line) {
                if (a.end.character === b.end.character) {
                    if (a.start.line === b.start.line) {
                        return a.start.character - b.start.character;
                    }
                    return a.start.line - b.start.line;
                }
                return a.end.character - b.end.character;
            }
            return a.end.line - b.end.line;
        });
        // check that no edits are overlapping
        for (let i = 0, count = editRanges.length - 1; i < count; i++) {
            const rangeEnd = editRanges[i].end;
            const nextRangeStart = editRanges[i + 1].start;
            if (nextRangeStart.isBefore(rangeEnd)) {
                // overlapping ranges
                return Promise.reject(new Error('Overlapping ranges are not allowed!'));
            }
        }
        // prepare data for serialization
        const edits = editData.edits.map((edit) => {
            return {
                range: TypeConverters.Range.from(edit.range),
                text: edit.text,
                forceMoveMarkers: edit.forceMoveMarkers
            };
        });
        return this._proxy.$tryApplyEdits(this.id, editData.documentVersionId, edits, {
            setEndOfLine: typeof editData.setEndOfLine === 'number' ? TypeConverters.EndOfLine.from(editData.setEndOfLine) : undefined,
            undoStopBefore: editData.undoStopBefore,
            undoStopAfter: editData.undoStopAfter
        });
    }
    _runOnProxy(callback) {
        if (this._disposed) {
            this._logService.warn('TextEditor is closed/disposed');
            return Promise.resolve(undefined);
        }
        return callback().then(() => this, err => {
            if (!(err instanceof Error && err.name === 'DISPOSED')) {
                this._logService.warn(err);
            }
            return null;
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRleHRFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFRleHRFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3BELE9BQU8sRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDaEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBS2xFLE9BQU8sS0FBSyxjQUFjLE1BQU0sNEJBQTRCLENBQUM7QUFDN0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBNkMsb0JBQW9CLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQU0zSSxNQUFNLE9BQU8sd0JBQXdCO2FBRVosVUFBSyxHQUFHLElBQUksV0FBVyxDQUFDLDBCQUEwQixDQUFDLENBQUM7SUFJNUUsWUFBWSxLQUFpQyxFQUFFLFNBQWdDLEVBQUUsT0FBdUM7UUFDdkgsTUFBTSxHQUFHLEdBQUcsd0JBQXdCLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3BELEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRSxjQUFjLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDekgsSUFBSSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQzFCLEdBQUc7WUFDSCxPQUFPO2dCQUNOLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM1QyxDQUFDO1NBQ0QsQ0FBQyxDQUFDO0lBQ0os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