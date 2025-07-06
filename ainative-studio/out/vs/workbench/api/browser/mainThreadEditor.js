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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFcEUsT0FBTyxFQUF5QixxQkFBcUIsRUFBRSxtQkFBbUIsRUFBZ0IsTUFBTSxnREFBZ0QsQ0FBQztBQUNqSixPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDckUsT0FBTyxFQUFjLFNBQVMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBS2pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ25HLE9BQU8sRUFBc0ksb0JBQW9CLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUV6TSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDeEQsT0FBTyxFQUF1QixXQUFXLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUU5RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFTekYsTUFBTSxPQUFPLDhCQUE4QjtJQUVuQyxNQUFNLENBQUMsY0FBYyxDQUFDLGtCQUF5RCxFQUFFLEtBQWlCLEVBQUUsVUFBOEI7UUFDeEksTUFBTSxVQUFVLEdBQUcsOEJBQThCLENBQUMsNkJBQTZCLENBQUMsa0JBQWtCLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDaEgsTUFBTSxPQUFPLEdBQUcsOEJBQThCLENBQUMsMEJBQTBCLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ2pILE1BQU0sYUFBYSxHQUFHLDhCQUE4QixDQUFDLGdDQUFnQyxDQUFDLGtCQUFrQixFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ3RILE9BQU8sSUFBSSw4QkFBOEIsQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQy9FLENBQUM7SUFFTyxNQUFNLENBQUMsNkJBQTZCLENBQUMsa0JBQXlELEVBQUUsVUFBOEI7UUFDckksSUFBSSxNQUFNLEdBQXVCLElBQUksQ0FBQztRQUN0QyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLE1BQU0sR0FBRyxVQUFVLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDckMsQ0FBQztRQUNELElBQUksQ0FBQyxNQUFNLElBQUksa0JBQWtCLEVBQUUsQ0FBQztZQUNuQyxNQUFNLEdBQUcsa0JBQWtCLENBQUMsVUFBVSxDQUFDO1FBQ3hDLENBQUM7UUFDRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixNQUFNLEdBQUcsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFTyxNQUFNLENBQUMsMEJBQTBCLENBQUMsa0JBQXlELEVBQUUsS0FBaUIsRUFBRSxVQUE4QjtRQUNySixJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDO1lBQ3hCLElBQUksa0JBQWtCLEVBQUUsQ0FBQztnQkFDeEIsZ0JBQWdCO2dCQUNoQixPQUFPLGtCQUFrQixDQUFDLE9BQU8sQ0FBQztZQUNuQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQ3hDLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxXQUFrQyxDQUFDO1FBQ3ZDLElBQUksV0FBa0MsQ0FBQztRQUN2QyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN4QyxNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsR0FBRyxtQ0FBMEIsQ0FBQztZQUM5RCxXQUFXLEdBQUcsT0FBTyxDQUFDLEdBQUcsbUNBQTBCLENBQUM7WUFDcEQsV0FBVyxHQUFHLGVBQWUsQ0FBQyxVQUFVLENBQUM7UUFDMUMsQ0FBQzthQUFNLElBQUksa0JBQWtCLEVBQUUsQ0FBQztZQUMvQixXQUFXLEdBQUcsa0JBQWtCLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQztZQUNyRCxXQUFXLEdBQUcsa0JBQWtCLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQztRQUN0RCxDQUFDO2FBQU0sQ0FBQztZQUNQLFdBQVcsR0FBRyxxQkFBcUIsQ0FBQyxJQUFJLENBQUM7WUFDekMsV0FBVyxtQ0FBMkIsQ0FBQztRQUN4QyxDQUFDO1FBRUQsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ3hDLE9BQU87WUFDTixZQUFZLEVBQUUsWUFBWSxDQUFDLFlBQVk7WUFDdkMsT0FBTyxFQUFFLFlBQVksQ0FBQyxPQUFPO1lBQzdCLFVBQVUsRUFBRSxZQUFZLENBQUMsVUFBVTtZQUNuQyxrQkFBa0IsRUFBRSxZQUFZLENBQUMsa0JBQWtCO1lBQ25ELFdBQVcsRUFBRSxXQUFXO1lBQ3hCLFdBQVcsRUFBRSxXQUFXO1NBQ3hCLENBQUM7SUFDSCxDQUFDO0lBRU8sTUFBTSxDQUFDLGdDQUFnQyxDQUFDLGtCQUF5RCxFQUFFLFVBQThCO1FBQ3hJLElBQUksVUFBVSxFQUFFLENBQUM7WUFDaEIsT0FBTyxVQUFVLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUN0QyxDQUFDO1FBQ0QsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRUQsWUFDaUIsVUFBdUIsRUFDdkIsT0FBeUMsRUFDekMsYUFBc0I7UUFGdEIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUN2QixZQUFPLEdBQVAsT0FBTyxDQUFrQztRQUN6QyxrQkFBYSxHQUFiLGFBQWEsQ0FBUztJQUV2QyxDQUFDO0lBRU0sYUFBYSxDQUFDLFFBQStDLEVBQUUscUJBQW9DO1FBQ3pHLE1BQU0sS0FBSyxHQUFnQztZQUMxQyxPQUFPLEVBQUUsSUFBSTtZQUNiLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLGFBQWEsRUFBRSxJQUFJO1NBQ25CLENBQUM7UUFFRixJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsOEJBQThCLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUN6RyxLQUFLLENBQUMsVUFBVSxHQUFHO2dCQUNsQixVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7Z0JBQzNCLE1BQU0sRUFBRSxxQkFBcUIsSUFBSSxTQUFTO2FBQzFDLENBQUM7UUFDSCxDQUFDO1FBRUQsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLDhCQUE4QixDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2hHLEtBQUssQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUM5QixDQUFDO1FBRUQsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLDhCQUE4QixDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO1lBQzNHLEtBQUssQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQztRQUMxQyxDQUFDO1FBRUQsSUFBSSxLQUFLLENBQUMsVUFBVSxJQUFJLEtBQUssQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQzlELG9CQUFvQjtZQUNwQixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxrQkFBa0I7UUFDbEIsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRU8sTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQXVCLEVBQUUsQ0FBdUI7UUFDL0UsT0FBTyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUN6RSxDQUFDO0lBRU8sTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFtQixFQUFFLENBQW1CO1FBQ25FLE9BQU8sTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDckUsQ0FBQztJQUVPLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBbUMsRUFBRSxDQUFtQztRQUNwRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN4QixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDZCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFDRCxPQUFPLENBQ04sQ0FBQyxDQUFDLE9BQU8sS0FBSyxDQUFDLENBQUMsT0FBTztlQUNwQixDQUFDLENBQUMsVUFBVSxLQUFLLENBQUMsQ0FBQyxVQUFVO2VBQzdCLENBQUMsQ0FBQyxZQUFZLEtBQUssQ0FBQyxDQUFDLFlBQVk7ZUFDakMsQ0FBQyxDQUFDLFdBQVcsS0FBSyxDQUFDLENBQUMsV0FBVztlQUMvQixDQUFDLENBQUMsV0FBVyxLQUFLLENBQUMsQ0FBQyxXQUFXLENBQ2xDLENBQUM7SUFDSCxDQUFDO0NBQ0Q7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sb0JBQW9CO0lBZWhDLFlBQ0MsRUFBVSxFQUNWLEtBQWlCLEVBQ2pCLFVBQXVCLEVBQ3ZCLFlBQTJCLEVBQzNCLG1CQUF3QyxFQUN4QyxZQUEyQixFQUMzQixnQkFBbUM7UUFmbkIsb0JBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBR3hDLHlCQUFvQixHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFjN0QsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDZCxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUNwQixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztRQUN4QixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztRQUN4QixJQUFJLENBQUMsYUFBYSxHQUFHLFlBQVksQ0FBQztRQUNsQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsbUJBQW1CLENBQUM7UUFDaEQsSUFBSSxDQUFDLGFBQWEsR0FBRyxZQUFZLENBQUM7UUFDbEMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLGdCQUFnQixDQUFDO1FBRTFDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLE9BQU8sRUFBK0IsQ0FBQztRQUV2RSxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDN0QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBRU0sT0FBTztRQUNiLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDL0IsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDeEIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3JDLENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxxQkFBb0M7UUFDaEUsSUFBSSxDQUFDLGNBQWMsQ0FDbEIsOEJBQThCLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQzlGLHFCQUFxQixDQUNyQixDQUFDO0lBQ0gsQ0FBQztJQUVPLGNBQWMsQ0FBQyxhQUE2QyxFQUFFLHFCQUFvQztRQUN6RyxNQUFNLEtBQUssR0FBRyxhQUFhLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUNuRixJQUFJLENBQUMsV0FBVyxHQUFHLGFBQWEsQ0FBQztRQUNqQyxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2QyxDQUFDO0lBQ0YsQ0FBQztJQUVNLEtBQUs7UUFDWCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUM7SUFDakIsQ0FBQztJQUVNLFFBQVE7UUFDZCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDcEIsQ0FBQztJQUVNLGFBQWE7UUFDbkIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQ3pCLENBQUM7SUFFTSxhQUFhLENBQUMsVUFBOEI7UUFDbEQsT0FBTyxDQUFDLElBQUksQ0FBQyxXQUFXLEtBQUssVUFBVSxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVNLGFBQWEsQ0FBQyxVQUE4QjtRQUNsRCxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUNwQyxtQkFBbUI7WUFDbkIsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFbEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUM7UUFDOUIsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFFdEIseUdBQXlHO1lBQ3pHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3BFLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVKLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLEVBQUU7Z0JBQzFFLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNKLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3pFLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDbEMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVKLElBQUkseUJBQXlCLEdBQWtCLElBQUksQ0FBQztZQUNwRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO2dCQUM5RixJQUFJLEdBQUcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO29CQUNuRCxNQUFNLHFCQUFxQixHQUFHLHlCQUF5QixDQUFDO29CQUN4RCx5QkFBeUIsR0FBRyxJQUFJLENBQUM7b0JBQ2pDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO2dCQUNsRCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVKLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxFQUFFO2dCQUM5QixtR0FBbUc7Z0JBQ25HLG1HQUFtRztnQkFDbkcseUVBQXlFO2dCQUN6RSx1RUFBdUU7Z0JBQ3ZFLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLEtBQUssSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzFFLENBQUMsQ0FBQztZQUVGLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxxQkFBb0MsRUFBRSxFQUFFO2dCQUNqRSw4RUFBOEU7Z0JBQzlFLDhFQUE4RTtnQkFDOUUscUVBQXFFO2dCQUNyRSxFQUFFO2dCQUNGLG9GQUFvRjtnQkFDcEYsMEJBQTBCO2dCQUMxQixJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQzdFLHlCQUF5QixHQUFHLElBQUksQ0FBQztvQkFDakMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHFCQUFxQixDQUFDLENBQUM7Z0JBQ2xELENBQUM7cUJBQU0sQ0FBQztvQkFDUCw0REFBNEQ7b0JBQzVELHlCQUF5QixHQUFHLHFCQUFxQixDQUFDO2dCQUNuRCxDQUFDO1lBQ0YsQ0FBQyxDQUFDO1lBRUYsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQy9FLFlBQVk7Z0JBQ1osSUFBSSxDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQztvQkFDMUIsT0FBTztnQkFDUixDQUFDO2dCQUNELGdCQUFnQixDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ0osSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQzdFLFVBQVU7Z0JBQ1YsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQztvQkFDMUIsT0FBTztnQkFDUixDQUFDO2dCQUNELGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDSixJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFO2dCQUNyRSxnQkFBZ0I7Z0JBQ2hCLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLENBQUM7b0JBQzFCLE9BQU87Z0JBQ1IsQ0FBQztnQkFDRCxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ0osSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRTtnQkFDckUsZ0JBQWdCO2dCQUNoQixJQUFJLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxDQUFDO29CQUMxQixPQUFPO2dCQUNSLENBQUM7Z0JBQ0QsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDeEIsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNKLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqQyxDQUFDO0lBQ0YsQ0FBQztJQUVNLFNBQVM7UUFDZixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQzNCLENBQUM7SUFFTSxhQUFhO1FBQ25CLE9BQU8sSUFBSSxDQUFDLFdBQVksQ0FBQztJQUMxQixDQUFDO0lBRUQsSUFBVyxtQkFBbUI7UUFDN0IsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDO0lBQ3hDLENBQUM7SUFFTSxhQUFhLENBQUMsVUFBd0I7UUFDNUMsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDM0MsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUM5RCxJQUFJLENBQUMsY0FBYyxDQUNsQixJQUFJLDhCQUE4QixDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsV0FBWSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBWSxDQUFDLGFBQWEsQ0FBQyxFQUM3RyxJQUFJLENBQ0osQ0FBQztJQUNILENBQUM7SUFFTyx1QkFBdUIsQ0FBQyxnQkFBZ0Q7UUFDL0UsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUV4SSxJQUFJLGdCQUFnQixDQUFDLE9BQU8sS0FBSyxNQUFNLElBQUksZ0JBQWdCLENBQUMsWUFBWSxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ3JGLDZEQUE2RDtZQUM3RCxJQUFJLFlBQVksR0FBRyxZQUFZLENBQUMsWUFBWSxDQUFDO1lBQzdDLElBQUksT0FBTyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUM7WUFFbkMsSUFBSSxnQkFBZ0IsQ0FBQyxZQUFZLEtBQUssTUFBTSxJQUFJLE9BQU8sZ0JBQWdCLENBQUMsWUFBWSxLQUFLLFdBQVcsRUFBRSxDQUFDO2dCQUN0RyxZQUFZLEdBQUcsZ0JBQWdCLENBQUMsWUFBWSxDQUFDO1lBQzlDLENBQUM7WUFFRCxJQUFJLGdCQUFnQixDQUFDLE9BQU8sS0FBSyxNQUFNLElBQUksT0FBTyxnQkFBZ0IsQ0FBQyxPQUFPLEtBQUssV0FBVyxFQUFFLENBQUM7Z0JBQzVGLE9BQU8sR0FBRyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUM7WUFDcEMsQ0FBQztZQUVELElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3JELE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQTRCLEVBQUUsQ0FBQztRQUM1QyxJQUFJLE9BQU8sZ0JBQWdCLENBQUMsWUFBWSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQzFELE9BQU8sQ0FBQyxZQUFZLEdBQUcsZ0JBQWdCLENBQUMsWUFBWSxDQUFDO1FBQ3RELENBQUM7UUFDRCxJQUFJLE9BQU8sZ0JBQWdCLENBQUMsT0FBTyxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQ3JELE9BQU8sQ0FBQyxPQUFPLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDO1FBQzVDLENBQUM7UUFDRCxJQUFJLE9BQU8sZ0JBQWdCLENBQUMsVUFBVSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQ3hELE9BQU8sQ0FBQyxVQUFVLEdBQUcsZ0JBQWdCLENBQUMsVUFBVSxDQUFDO1FBQ2xELENBQUM7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRU0sZ0JBQWdCLENBQUMsZ0JBQWdEO1FBQ3ZFLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBRS9DLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkIsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sY0FBYyxHQUFHLG1CQUFtQixDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3pFLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDO2dCQUM5QixXQUFXLEVBQUUsY0FBYzthQUMzQixDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsSUFBSSxPQUFPLGdCQUFnQixDQUFDLFdBQVcsS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUN6RCxJQUFJLFdBQW1ELENBQUM7WUFDeEQsUUFBUSxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDdEM7b0JBQ0MsV0FBVyxHQUFHLElBQUksQ0FBQztvQkFDbkIsTUFBTTtnQkFDUDtvQkFDQyxXQUFXLEdBQUcsVUFBVSxDQUFDO29CQUN6QixNQUFNO2dCQUNQO29CQUNDLFdBQVcsR0FBRyxVQUFVLENBQUM7b0JBQ3pCLE1BQU07Z0JBQ1A7b0JBQ0MsV0FBVyxHQUFHLEtBQUssQ0FBQztZQUN0QixDQUFDO1lBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUM7Z0JBQzlCLFdBQVcsRUFBRSxXQUFXO2FBQ3hCLENBQUMsQ0FBQztRQUNKLENBQUM7SUFDRixDQUFDO0lBRU0sY0FBYyxDQUFDLEdBQVcsRUFBRSxNQUE0QjtRQUM5RCxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3ZCLE9BQU87UUFDUixDQUFDO1FBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ25FLENBQUM7SUFFTSxrQkFBa0IsQ0FBQyxHQUFXLEVBQUUsT0FBaUI7UUFDdkQsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN2QixPQUFPO1FBQ1IsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFZLEVBQUUsQ0FBQztRQUMzQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNwRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25HLENBQUM7UUFDRCxJQUFJLENBQUMsV0FBVyxDQUFDLHdCQUF3QixDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRU0sV0FBVyxDQUFDLEtBQWEsRUFBRSxVQUFnQztRQUNqRSxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3ZCLE9BQU87UUFDUixDQUFDO1FBQ0QsUUFBUSxVQUFVLEVBQUUsQ0FBQztZQUNwQixLQUFLLG9CQUFvQixDQUFDLE9BQU87Z0JBQ2hDLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEtBQUssNEJBQW9CLENBQUM7Z0JBQ3ZELE1BQU07WUFDUCxLQUFLLG9CQUFvQixDQUFDLFFBQVE7Z0JBQ2pDLElBQUksQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsS0FBSyw0QkFBb0IsQ0FBQztnQkFDL0QsTUFBTTtZQUNQLEtBQUssb0JBQW9CLENBQUMseUJBQXlCO2dCQUNsRCxJQUFJLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEtBQUssNEJBQW9CLENBQUM7Z0JBQ2hGLE1BQU07WUFDUCxLQUFLLG9CQUFvQixDQUFDLEtBQUs7Z0JBQzlCLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsS0FBSyw0QkFBb0IsQ0FBQztnQkFDNUQsTUFBTTtZQUNQO2dCQUNDLE9BQU8sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLFVBQVUsRUFBRSxDQUFDLENBQUM7Z0JBQ2xELE1BQU07UUFDUixDQUFDO0lBQ0YsQ0FBQztJQUVNLFNBQVM7UUFDZixJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN0QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDeEMsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVNLE9BQU8sQ0FBQyxNQUFtQjtRQUNqQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQyxVQUFVLEVBQUUsS0FBSyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQ2pELENBQUM7SUFFTSxVQUFVLENBQUMsY0FBc0IsRUFBRSxLQUE2QixFQUFFLElBQXdCO1FBQ2hHLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsS0FBSyxjQUFjLEVBQUUsQ0FBQztZQUNuRCx5REFBeUQ7WUFDekQsZ0NBQWdDO1lBQ2hDLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkIsa0RBQWtEO1lBQ2xELE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELElBQUksT0FBTyxJQUFJLENBQUMsWUFBWSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQzlDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN4QyxDQUFDO1FBRUQsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUF3QixFQUFFO1lBQ2pFLE9BQU87Z0JBQ04sS0FBSyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztnQkFDN0IsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO2dCQUNmLGdCQUFnQixFQUFFLElBQUksQ0FBQyxnQkFBZ0I7YUFDdkMsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDekIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNqQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsc0JBQXNCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUN4RSxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ2pDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUFDLGNBQXNCLEVBQUUsUUFBZ0IsRUFBRSxNQUF5QixFQUFFLElBQXFCO1FBRTdHLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ3ZELE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELDhEQUE4RDtRQUM5RCxJQUFJLGFBQWlDLENBQUM7UUFDdEMsTUFBTSxhQUFhLEdBQUcsYUFBYSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2xFLElBQUksYUFBYSxFQUFFLENBQUM7WUFDbkIsTUFBTSxLQUFLLEdBQUcsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSx3RUFBd0QsQ0FBQyxDQUFDO1lBQzFHLGFBQWEsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUN4RCxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztnQkFDdkMsT0FBTyxLQUFLLENBQUM7WUFDZCxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxZQUFZLEVBQUUsS0FBSyxjQUFjLEVBQUUsQ0FBQztZQUNuRSxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxNQUFNLGlCQUFpQixHQUFHLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDbkUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDeEIsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUV6QixxQ0FBcUM7UUFDckMsTUFBTSxLQUFLLEdBQW1CLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVGLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUU7WUFDOUIsZUFBZSxFQUFFLENBQUMsRUFBRSxjQUFjLEVBQUUsQ0FBQztZQUNyQyxjQUFjLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWE7WUFDdEUsZ0JBQWdCLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYztZQUN0QyxhQUFhO1NBQ2IsQ0FBQyxDQUFDO1FBRUgsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0NBQ0QifQ==