/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { TextEditorCursorStyle, cursorStyleToString } from '../../../editor/common/config/editorOptions.js';
import { Range } from '../../../editor/common/core/range.js';
import { Selection } from '../../../editor/common/core/selection.js';
import { SnippetController2 } from '../../../editor/contrib/snippet/browser/snippetController2.js';
import { TextEditorRevealType } from '../common/extHost.protocol.js';
import { equals } from '../../../base/common/arrays.js';
import { EditorState } from '../../../editor/contrib/editorState/browser/editorState.js';
import { SnippetParser } from '../../../editor/contrib/snippet/browser/snippetParser.js';
export class MainThreadTextEditorProperties {
    static readFromEditor(previousProperties, model, codeEditor) {
        const selections = MainThreadTextEditorProperties._readSelectionsFromCodeEditor(previousProperties, codeEditor);
        const options = MainThreadTextEditorProperties._readOptionsFromCodeEditor(previousProperties, model, codeEditor);
        const visibleRanges = MainThreadTextEditorProperties._readVisibleRangesFromCodeEditor(previousProperties, codeEditor);
        return new MainThreadTextEditorProperties(selections, options, visibleRanges);
    }
    static _readSelectionsFromCodeEditor(previousProperties, codeEditor) {
        let result = null;
        if (codeEditor) {
            result = codeEditor.getSelections();
        }
        if (!result && previousProperties) {
            result = previousProperties.selections;
        }
        if (!result) {
            result = [new Selection(1, 1, 1, 1)];
        }
        return result;
    }
    static _readOptionsFromCodeEditor(previousProperties, model, codeEditor) {
        if (model.isDisposed()) {
            if (previousProperties) {
                // shutdown time
                return previousProperties.options;
            }
            else {
                throw new Error('No valid properties');
            }
        }
        let cursorStyle;
        let lineNumbers;
        if (codeEditor) {
            const options = codeEditor.getOptions();
            const lineNumbersOpts = options.get(69 /* EditorOption.lineNumbers */);
            cursorStyle = options.get(28 /* EditorOption.cursorStyle */);
            lineNumbers = lineNumbersOpts.renderType;
        }
        else if (previousProperties) {
            cursorStyle = previousProperties.options.cursorStyle;
            lineNumbers = previousProperties.options.lineNumbers;
        }
        else {
            cursorStyle = TextEditorCursorStyle.Line;
            lineNumbers = 1 /* RenderLineNumbersType.On */;
        }
        const modelOptions = model.getOptions();
        return {
            insertSpaces: modelOptions.insertSpaces,
            tabSize: modelOptions.tabSize,
            indentSize: modelOptions.indentSize,
            originalIndentSize: modelOptions.originalIndentSize,
            cursorStyle: cursorStyle,
            lineNumbers: lineNumbers
        };
    }
    static _readVisibleRangesFromCodeEditor(previousProperties, codeEditor) {
        if (codeEditor) {
            return codeEditor.getVisibleRanges();
        }
        return [];
    }
    constructor(selections, options, visibleRanges) {
        this.selections = selections;
        this.options = options;
        this.visibleRanges = visibleRanges;
    }
    generateDelta(oldProps, selectionChangeSource) {
        const delta = {
            options: null,
            selections: null,
            visibleRanges: null
        };
        if (!oldProps || !MainThreadTextEditorProperties._selectionsEqual(oldProps.selections, this.selections)) {
            delta.selections = {
                selections: this.selections,
                source: selectionChangeSource ?? undefined,
            };
        }
        if (!oldProps || !MainThreadTextEditorProperties._optionsEqual(oldProps.options, this.options)) {
            delta.options = this.options;
        }
        if (!oldProps || !MainThreadTextEditorProperties._rangesEqual(oldProps.visibleRanges, this.visibleRanges)) {
            delta.visibleRanges = this.visibleRanges;
        }
        if (delta.selections || delta.options || delta.visibleRanges) {
            // something changed
            return delta;
        }
        // nothing changed
        return null;
    }
    static _selectionsEqual(a, b) {
        return equals(a, b, (aValue, bValue) => aValue.equalsSelection(bValue));
    }
    static _rangesEqual(a, b) {
        return equals(a, b, (aValue, bValue) => aValue.equalsRange(bValue));
    }
    static _optionsEqual(a, b) {
        if (a && !b || !a && b) {
            return false;
        }
        if (!a && !b) {
            return true;
        }
        return (a.tabSize === b.tabSize
            && a.indentSize === b.indentSize
            && a.insertSpaces === b.insertSpaces
            && a.cursorStyle === b.cursorStyle
            && a.lineNumbers === b.lineNumbers);
    }
}
/**
 * Text Editor that is permanently bound to the same model.
 * It can be bound or not to a CodeEditor.
 */
export class MainThreadTextEditor {
    constructor(id, model, codeEditor, focusTracker, mainThreadDocuments, modelService, clipboardService) {
        this._modelListeners = new DisposableStore();
        this._codeEditorListeners = new DisposableStore();
        this._id = id;
        this._model = model;
        this._codeEditor = null;
        this._properties = null;
        this._focusTracker = focusTracker;
        this._mainThreadDocuments = mainThreadDocuments;
        this._modelService = modelService;
        this._clipboardService = clipboardService;
        this._onPropertiesChanged = new Emitter();
        this._modelListeners.add(this._model.onDidChangeOptions((e) => {
            this._updatePropertiesNow(null);
        }));
        this.setCodeEditor(codeEditor);
        this._updatePropertiesNow(null);
    }
    dispose() {
        this._modelListeners.dispose();
        this._codeEditor = null;
        this._codeEditorListeners.dispose();
    }
    _updatePropertiesNow(selectionChangeSource) {
        this._setProperties(MainThreadTextEditorProperties.readFromEditor(this._properties, this._model, this._codeEditor), selectionChangeSource);
    }
    _setProperties(newProperties, selectionChangeSource) {
        const delta = newProperties.generateDelta(this._properties, selectionChangeSource);
        this._properties = newProperties;
        if (delta) {
            this._onPropertiesChanged.fire(delta);
        }
    }
    getId() {
        return this._id;
    }
    getModel() {
        return this._model;
    }
    getCodeEditor() {
        return this._codeEditor;
    }
    hasCodeEditor(codeEditor) {
        return (this._codeEditor === codeEditor);
    }
    setCodeEditor(codeEditor) {
        if (this.hasCodeEditor(codeEditor)) {
            // Nothing to do...
            return;
        }
        this._codeEditorListeners.clear();
        this._codeEditor = codeEditor;
        if (this._codeEditor) {
            // Catch early the case that this code editor gets a different model set and disassociate from this model
            this._codeEditorListeners.add(this._codeEditor.onDidChangeModel(() => {
                this.setCodeEditor(null);
            }));
            this._codeEditorListeners.add(this._codeEditor.onDidFocusEditorWidget(() => {
                this._focusTracker.onGainedFocus();
            }));
            this._codeEditorListeners.add(this._codeEditor.onDidBlurEditorWidget(() => {
                this._focusTracker.onLostFocus();
            }));
            let nextSelectionChangeSource = null;
            this._codeEditorListeners.add(this._mainThreadDocuments.onIsCaughtUpWithContentChanges((uri) => {
                if (uri.toString() === this._model.uri.toString()) {
                    const selectionChangeSource = nextSelectionChangeSource;
                    nextSelectionChangeSource = null;
                    this._updatePropertiesNow(selectionChangeSource);
                }
            }));
            const isValidCodeEditor = () => {
                // Due to event timings, it is possible that there is a model change event not yet delivered to us.
                // > e.g. a model change event is emitted to a listener which then decides to update editor options
                // > In this case the editor configuration change event reaches us first.
                // So simply check that the model is still attached to this code editor
                return (this._codeEditor && this._codeEditor.getModel() === this._model);
            };
            const updateProperties = (selectionChangeSource) => {
                // Some editor events get delivered faster than model content changes. This is
                // problematic, as this leads to editor properties reaching the extension host
                // too soon, before the model content change that was the root cause.
                //
                // If this case is identified, then let's update editor properties on the next model
                // content change instead.
                if (this._mainThreadDocuments.isCaughtUpWithContentChanges(this._model.uri)) {
                    nextSelectionChangeSource = null;
                    this._updatePropertiesNow(selectionChangeSource);
                }
                else {
                    // update editor properties on the next model content change
                    nextSelectionChangeSource = selectionChangeSource;
                }
            };
            this._codeEditorListeners.add(this._codeEditor.onDidChangeCursorSelection((e) => {
                // selection
                if (!isValidCodeEditor()) {
                    return;
                }
                updateProperties(e.source);
            }));
            this._codeEditorListeners.add(this._codeEditor.onDidChangeConfiguration((e) => {
                // options
                if (!isValidCodeEditor()) {
                    return;
                }
                updateProperties(null);
            }));
            this._codeEditorListeners.add(this._codeEditor.onDidLayoutChange(() => {
                // visibleRanges
                if (!isValidCodeEditor()) {
                    return;
                }
                updateProperties(null);
            }));
            this._codeEditorListeners.add(this._codeEditor.onDidScrollChange(() => {
                // visibleRanges
                if (!isValidCodeEditor()) {
                    return;
                }
                updateProperties(null);
            }));
            this._updatePropertiesNow(null);
        }
    }
    isVisible() {
        return !!this._codeEditor;
    }
    getProperties() {
        return this._properties;
    }
    get onPropertiesChanged() {
        return this._onPropertiesChanged.event;
    }
    setSelections(selections) {
        if (this._codeEditor) {
            this._codeEditor.setSelections(selections);
            return;
        }
        const newSelections = selections.map(Selection.liftSelection);
        this._setProperties(new MainThreadTextEditorProperties(newSelections, this._properties.options, this._properties.visibleRanges), null);
    }
    _setIndentConfiguration(newConfiguration) {
        const creationOpts = this._modelService.getCreationOptions(this._model.getLanguageId(), this._model.uri, this._model.isForSimpleWidget);
        if (newConfiguration.tabSize === 'auto' || newConfiguration.insertSpaces === 'auto') {
            // one of the options was set to 'auto' => detect indentation
            let insertSpaces = creationOpts.insertSpaces;
            let tabSize = creationOpts.tabSize;
            if (newConfiguration.insertSpaces !== 'auto' && typeof newConfiguration.insertSpaces !== 'undefined') {
                insertSpaces = newConfiguration.insertSpaces;
            }
            if (newConfiguration.tabSize !== 'auto' && typeof newConfiguration.tabSize !== 'undefined') {
                tabSize = newConfiguration.tabSize;
            }
            this._model.detectIndentation(insertSpaces, tabSize);
            return;
        }
        const newOpts = {};
        if (typeof newConfiguration.insertSpaces !== 'undefined') {
            newOpts.insertSpaces = newConfiguration.insertSpaces;
        }
        if (typeof newConfiguration.tabSize !== 'undefined') {
            newOpts.tabSize = newConfiguration.tabSize;
        }
        if (typeof newConfiguration.indentSize !== 'undefined') {
            newOpts.indentSize = newConfiguration.indentSize;
        }
        this._model.updateOptions(newOpts);
    }
    setConfiguration(newConfiguration) {
        this._setIndentConfiguration(newConfiguration);
        if (!this._codeEditor) {
            return;
        }
        if (newConfiguration.cursorStyle) {
            const newCursorStyle = cursorStyleToString(newConfiguration.cursorStyle);
            this._codeEditor.updateOptions({
                cursorStyle: newCursorStyle
            });
        }
        if (typeof newConfiguration.lineNumbers !== 'undefined') {
            let lineNumbers;
            switch (newConfiguration.lineNumbers) {
                case 1 /* RenderLineNumbersType.On */:
                    lineNumbers = 'on';
                    break;
                case 2 /* RenderLineNumbersType.Relative */:
                    lineNumbers = 'relative';
                    break;
                case 3 /* RenderLineNumbersType.Interval */:
                    lineNumbers = 'interval';
                    break;
                default:
                    lineNumbers = 'off';
            }
            this._codeEditor.updateOptions({
                lineNumbers: lineNumbers
            });
        }
    }
    setDecorations(key, ranges) {
        if (!this._codeEditor) {
            return;
        }
        this._codeEditor.setDecorationsByType('exthost-api', key, ranges);
    }
    setDecorationsFast(key, _ranges) {
        if (!this._codeEditor) {
            return;
        }
        const ranges = [];
        for (let i = 0, len = Math.floor(_ranges.length / 4); i < len; i++) {
            ranges[i] = new Range(_ranges[4 * i], _ranges[4 * i + 1], _ranges[4 * i + 2], _ranges[4 * i + 3]);
        }
        this._codeEditor.setDecorationsByTypeFast(key, ranges);
    }
    revealRange(range, revealType) {
        if (!this._codeEditor) {
            return;
        }
        switch (revealType) {
            case TextEditorRevealType.Default:
                this._codeEditor.revealRange(range, 0 /* ScrollType.Smooth */);
                break;
            case TextEditorRevealType.InCenter:
                this._codeEditor.revealRangeInCenter(range, 0 /* ScrollType.Smooth */);
                break;
            case TextEditorRevealType.InCenterIfOutsideViewport:
                this._codeEditor.revealRangeInCenterIfOutsideViewport(range, 0 /* ScrollType.Smooth */);
                break;
            case TextEditorRevealType.AtTop:
                this._codeEditor.revealRangeAtTop(range, 0 /* ScrollType.Smooth */);
                break;
            default:
                console.warn(`Unknown revealType: ${revealType}`);
                break;
        }
    }
    isFocused() {
        if (this._codeEditor) {
            return this._codeEditor.hasTextFocus();
        }
        return false;
    }
    matches(editor) {
        if (!editor) {
            return false;
        }
        return editor.getControl() === this._codeEditor;
    }
    applyEdits(versionIdCheck, edits, opts) {
        if (this._model.getVersionId() !== versionIdCheck) {
            // throw new Error('Model has changed in the meantime!');
            // model changed in the meantime
            return false;
        }
        if (!this._codeEditor) {
            // console.warn('applyEdits on invisible editor');
            return false;
        }
        if (typeof opts.setEndOfLine !== 'undefined') {
            this._model.pushEOL(opts.setEndOfLine);
        }
        const transformedEdits = edits.map((edit) => {
            return {
                range: Range.lift(edit.range),
                text: edit.text,
                forceMoveMarkers: edit.forceMoveMarkers
            };
        });
        if (opts.undoStopBefore) {
            this._codeEditor.pushUndoStop();
        }
        this._codeEditor.executeEdits('MainThreadTextEditor', transformedEdits);
        if (opts.undoStopAfter) {
            this._codeEditor.pushUndoStop();
        }
        return true;
    }
    async insertSnippet(modelVersionId, template, ranges, opts) {
        if (!this._codeEditor || !this._codeEditor.hasModel()) {
            return false;
        }
        // check if clipboard is required and only iff read it (async)
        let clipboardText;
        const needsTemplate = SnippetParser.guessNeedsClipboard(template);
        if (needsTemplate) {
            const state = new EditorState(this._codeEditor, 1 /* CodeEditorStateFlag.Value */ | 4 /* CodeEditorStateFlag.Position */);
            clipboardText = await this._clipboardService.readText();
            if (!state.validate(this._codeEditor)) {
                return false;
            }
        }
        if (this._codeEditor.getModel().getVersionId() !== modelVersionId) {
            return false;
        }
        const snippetController = SnippetController2.get(this._codeEditor);
        if (!snippetController) {
            return false;
        }
        this._codeEditor.focus();
        // make modifications as snippet edit
        const edits = ranges.map(range => ({ range: Range.lift(range), template }));
        snippetController.apply(edits, {
            overwriteBefore: 0, overwriteAfter: 0,
            undoStopBefore: opts.undoStopBefore, undoStopAfter: opts.undoStopAfter,
            adjustWhitespace: !opts.keepWhitespace,
            clipboardText
        });
        return true;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZEVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXBFLE9BQU8sRUFBeUIscUJBQXFCLEVBQUUsbUJBQW1CLEVBQWdCLE1BQU0sZ0RBQWdELENBQUM7QUFDakosT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3JFLE9BQU8sRUFBYyxTQUFTLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUtqRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUNuRyxPQUFPLEVBQXNJLG9CQUFvQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFek0sT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3hELE9BQU8sRUFBdUIsV0FBVyxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFOUcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBU3pGLE1BQU0sT0FBTyw4QkFBOEI7SUFFbkMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxrQkFBeUQsRUFBRSxLQUFpQixFQUFFLFVBQThCO1FBQ3hJLE1BQU0sVUFBVSxHQUFHLDhCQUE4QixDQUFDLDZCQUE2QixDQUFDLGtCQUFrQixFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ2hILE1BQU0sT0FBTyxHQUFHLDhCQUE4QixDQUFDLDBCQUEwQixDQUFDLGtCQUFrQixFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FB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