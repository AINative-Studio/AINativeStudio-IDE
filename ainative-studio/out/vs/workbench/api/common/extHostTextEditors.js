/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from '../../../base/common/arrays.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { MainContext } from './extHost.protocol.js';
import { TextEditorDecorationType } from './extHostTextEditor.js';
import * as TypeConverters from './extHostTypeConverters.js';
import { TextEditorSelectionChangeKind, TextEditorChangeKind } from './extHostTypes.js';
export class ExtHostEditors extends Disposable {
    constructor(mainContext, _extHostDocumentsAndEditors) {
        super();
        this._extHostDocumentsAndEditors = _extHostDocumentsAndEditors;
        this._onDidChangeTextEditorSelection = new Emitter();
        this._onDidChangeTextEditorOptions = new Emitter();
        this._onDidChangeTextEditorVisibleRanges = new Emitter();
        this._onDidChangeTextEditorViewColumn = new Emitter();
        this._onDidChangeTextEditorDiffInformation = new Emitter();
        this._onDidChangeActiveTextEditor = new Emitter();
        this._onDidChangeVisibleTextEditors = new Emitter();
        this.onDidChangeTextEditorSelection = this._onDidChangeTextEditorSelection.event;
        this.onDidChangeTextEditorOptions = this._onDidChangeTextEditorOptions.event;
        this.onDidChangeTextEditorVisibleRanges = this._onDidChangeTextEditorVisibleRanges.event;
        this.onDidChangeTextEditorViewColumn = this._onDidChangeTextEditorViewColumn.event;
        this.onDidChangeTextEditorDiffInformation = this._onDidChangeTextEditorDiffInformation.event;
        this.onDidChangeActiveTextEditor = this._onDidChangeActiveTextEditor.event;
        this.onDidChangeVisibleTextEditors = this._onDidChangeVisibleTextEditors.event;
        this._proxy = mainContext.getProxy(MainContext.MainThreadTextEditors);
        this._register(this._extHostDocumentsAndEditors.onDidChangeVisibleTextEditors(e => this._onDidChangeVisibleTextEditors.fire(e)));
        this._register(this._extHostDocumentsAndEditors.onDidChangeActiveTextEditor(e => this._onDidChangeActiveTextEditor.fire(e)));
    }
    getActiveTextEditor() {
        return this._extHostDocumentsAndEditors.activeEditor();
    }
    getVisibleTextEditors(internal) {
        const editors = this._extHostDocumentsAndEditors.allEditors();
        return internal
            ? editors
            : editors.map(editor => editor.value);
    }
    async showTextDocument(document, columnOrOptions, preserveFocus) {
        let options;
        if (typeof columnOrOptions === 'number') {
            options = {
                position: TypeConverters.ViewColumn.from(columnOrOptions),
                preserveFocus
            };
        }
        else if (typeof columnOrOptions === 'object') {
            options = {
                position: TypeConverters.ViewColumn.from(columnOrOptions.viewColumn),
                preserveFocus: columnOrOptions.preserveFocus,
                selection: typeof columnOrOptions.selection === 'object' ? TypeConverters.Range.from(columnOrOptions.selection) : undefined,
                pinned: typeof columnOrOptions.preview === 'boolean' ? !columnOrOptions.preview : undefined
            };
        }
        else {
            options = {
                preserveFocus: false
            };
        }
        const editorId = await this._proxy.$tryShowTextDocument(document.uri, options);
        const editor = editorId && this._extHostDocumentsAndEditors.getEditor(editorId);
        if (editor) {
            return editor.value;
        }
        // we have no editor... having an id means that we had an editor
        // on the main side and that it isn't the current editor anymore...
        if (editorId) {
            throw new Error(`Could NOT open editor for "${document.uri.toString()}" because another editor opened in the meantime.`);
        }
        else {
            throw new Error(`Could NOT open editor for "${document.uri.toString()}".`);
        }
    }
    createTextEditorDecorationType(extension, options) {
        return new TextEditorDecorationType(this._proxy, extension, options).value;
    }
    // --- called from main thread
    $acceptEditorPropertiesChanged(id, data) {
        const textEditor = this._extHostDocumentsAndEditors.getEditor(id);
        if (!textEditor) {
            throw new Error('unknown text editor');
        }
        // (1) set all properties
        if (data.options) {
            textEditor._acceptOptions(data.options);
        }
        if (data.selections) {
            const selections = data.selections.selections.map(TypeConverters.Selection.to);
            textEditor._acceptSelections(selections);
        }
        if (data.visibleRanges) {
            const visibleRanges = arrays.coalesce(data.visibleRanges.map(TypeConverters.Range.to));
            textEditor._acceptVisibleRanges(visibleRanges);
        }
        // (2) fire change events
        if (data.options) {
            this._onDidChangeTextEditorOptions.fire({
                textEditor: textEditor.value,
                options: { ...data.options, lineNumbers: TypeConverters.TextEditorLineNumbersStyle.to(data.options.lineNumbers) }
            });
        }
        if (data.selections) {
            const kind = TextEditorSelectionChangeKind.fromValue(data.selections.source);
            const selections = data.selections.selections.map(TypeConverters.Selection.to);
            this._onDidChangeTextEditorSelection.fire({
                textEditor: textEditor.value,
                selections,
                kind
            });
        }
        if (data.visibleRanges) {
            const visibleRanges = arrays.coalesce(data.visibleRanges.map(TypeConverters.Range.to));
            this._onDidChangeTextEditorVisibleRanges.fire({
                textEditor: textEditor.value,
                visibleRanges
            });
        }
    }
    $acceptEditorPositionData(data) {
        for (const id in data) {
            const textEditor = this._extHostDocumentsAndEditors.getEditor(id);
            if (!textEditor) {
                throw new Error('Unknown text editor');
            }
            const viewColumn = TypeConverters.ViewColumn.to(data[id]);
            if (textEditor.value.viewColumn !== viewColumn) {
                textEditor._acceptViewColumn(viewColumn);
                this._onDidChangeTextEditorViewColumn.fire({ textEditor: textEditor.value, viewColumn });
            }
        }
    }
    $acceptEditorDiffInformation(id, diffInformation) {
        const textEditor = this._extHostDocumentsAndEditors.getEditor(id);
        if (!textEditor) {
            throw new Error('unknown text editor');
        }
        if (!diffInformation) {
            textEditor._acceptDiffInformation(undefined);
            this._onDidChangeTextEditorDiffInformation.fire({
                textEditor: textEditor.value,
                diffInformation: undefined
            });
            return;
        }
        const that = this;
        const result = diffInformation.map(diff => {
            const original = URI.revive(diff.original);
            const modified = URI.revive(diff.modified);
            const changes = diff.changes.map(change => {
                const [originalStartLineNumber, originalEndLineNumberExclusive, modifiedStartLineNumber, modifiedEndLineNumberExclusive] = change;
                let kind;
                if (originalStartLineNumber === originalEndLineNumberExclusive) {
                    kind = TextEditorChangeKind.Addition;
                }
                else if (modifiedStartLineNumber === modifiedEndLineNumberExclusive) {
                    kind = TextEditorChangeKind.Deletion;
                }
                else {
                    kind = TextEditorChangeKind.Modification;
                }
                return {
                    original: {
                        startLineNumber: originalStartLineNumber,
                        endLineNumberExclusive: originalEndLineNumberExclusive
                    },
                    modified: {
                        startLineNumber: modifiedStartLineNumber,
                        endLineNumberExclusive: modifiedEndLineNumberExclusive
                    },
                    kind
                };
            });
            return Object.freeze({
                documentVersion: diff.documentVersion,
                original,
                modified,
                changes,
                get isStale() {
                    const document = that._extHostDocumentsAndEditors.getDocument(modified);
                    return document?.version !== diff.documentVersion;
                }
            });
        });
        textEditor._acceptDiffInformation(result);
        this._onDidChangeTextEditorDiffInformation.fire({
            textEditor: textEditor.value,
            diffInformation: result
        });
    }
    getDiffInformation(id) {
        return Promise.resolve(this._proxy.$getDiffInformation(id));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRleHRFZGl0b3JzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFRleHRFZGl0b3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sZ0NBQWdDLENBQUM7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFbEQsT0FBTyxFQUFpSixXQUFXLEVBQThCLE1BQU0sdUJBQXVCLENBQUM7QUFFL04sT0FBTyxFQUFxQix3QkFBd0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3JGLE9BQU8sS0FBSyxjQUFjLE1BQU0sNEJBQTRCLENBQUM7QUFDN0QsT0FBTyxFQUFFLDZCQUE2QixFQUFFLG9CQUFvQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFHeEYsTUFBTSxPQUFPLGNBQWUsU0FBUSxVQUFVO0lBb0I3QyxZQUNDLFdBQXlCLEVBQ1IsMkJBQXVEO1FBRXhFLEtBQUssRUFBRSxDQUFDO1FBRlMsZ0NBQTJCLEdBQTNCLDJCQUEyQixDQUE0QjtRQXBCeEQsb0NBQStCLEdBQUcsSUFBSSxPQUFPLEVBQXlDLENBQUM7UUFDdkYsa0NBQTZCLEdBQUcsSUFBSSxPQUFPLEVBQXVDLENBQUM7UUFDbkYsd0NBQW1DLEdBQUcsSUFBSSxPQUFPLEVBQTZDLENBQUM7UUFDL0YscUNBQWdDLEdBQUcsSUFBSSxPQUFPLEVBQTBDLENBQUM7UUFDekYsMENBQXFDLEdBQUcsSUFBSSxPQUFPLEVBQStDLENBQUM7UUFDbkcsaUNBQTRCLEdBQUcs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