/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, MutableDisposable, dispose } from '../../../../../base/common/lifecycle.js';
import { Mimes } from '../../../../../base/common/mime.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { Selection } from '../../../../../editor/common/core/selection.js';
import { SearchParams } from '../../../../../editor/common/model/textModelSearch.js';
import { readTransientState, writeTransientState } from '../../../codeEditor/browser/toggleWordWrap.js';
import { CellEditState, CellFocusMode, CursorAtBoundary, CursorAtLineBoundary } from '../notebookBrowser.js';
export class BaseCellViewModel extends Disposable {
    get handle() {
        return this.model.handle;
    }
    get uri() {
        return this.model.uri;
    }
    get lineCount() {
        return this.model.textBuffer.getLineCount();
    }
    get metadata() {
        return this.model.metadata;
    }
    get internalMetadata() {
        return this.model.internalMetadata;
    }
    get language() {
        return this.model.language;
    }
    get mime() {
        if (typeof this.model.mime === 'string') {
            return this.model.mime;
        }
        switch (this.language) {
            case 'markdown':
                return Mimes.markdown;
            default:
                return Mimes.text;
        }
    }
    get lineNumbers() {
        return this._lineNumbers;
    }
    set lineNumbers(lineNumbers) {
        if (lineNumbers === this._lineNumbers) {
            return;
        }
        this._lineNumbers = lineNumbers;
        this._onDidChangeState.fire({ cellLineNumberChanged: true });
    }
    get commentOptions() {
        return this._commentOptions;
    }
    set commentOptions(newOptions) {
        this._commentOptions = newOptions;
    }
    get focusMode() {
        return this._focusMode;
    }
    set focusMode(newMode) {
        if (this._focusMode !== newMode) {
            this._focusMode = newMode;
            this._onDidChangeState.fire({ focusModeChanged: true });
        }
    }
    get editorAttached() {
        return !!this._textEditor;
    }
    get textModel() {
        return this.model.textModel;
    }
    hasModel() {
        return !!this.textModel;
    }
    get dragging() {
        return this._dragging;
    }
    set dragging(v) {
        this._dragging = v;
        this._onDidChangeState.fire({ dragStateChanged: true });
    }
    get isInputCollapsed() {
        return this._inputCollapsed;
    }
    set isInputCollapsed(v) {
        this._inputCollapsed = v;
        this._onDidChangeState.fire({ inputCollapsedChanged: true });
    }
    get isOutputCollapsed() {
        return this._outputCollapsed;
    }
    set isOutputCollapsed(v) {
        this._outputCollapsed = v;
        this._onDidChangeState.fire({ outputCollapsedChanged: true });
    }
    set commentHeight(height) {
        if (this._commentHeight === height) {
            return;
        }
        this._commentHeight = height;
        this.layoutChange({ commentHeight: true }, 'BaseCellViewModel#commentHeight');
    }
    constructor(viewType, model, id, _viewContext, _configurationService, _modelService, _undoRedoService, _codeEditorService, _inlineChatSessionService
    // private readonly _keymapService: INotebookKeymapService
    ) {
        super();
        this.viewType = viewType;
        this.model = model;
        this.id = id;
        this._viewContext = _viewContext;
        this._configurationService = _configurationService;
        this._modelService = _modelService;
        this._undoRedoService = _undoRedoService;
        this._codeEditorService = _codeEditorService;
        this._inlineChatSessionService = _inlineChatSessionService;
        this._onDidChangeEditorAttachState = this._register(new Emitter());
        // Do not merge this event with `onDidChangeState` as we are using `Event.once(onDidChangeEditorAttachState)` elsewhere.
        this.onDidChangeEditorAttachState = this._onDidChangeEditorAttachState.event;
        this._onDidChangeState = this._register(new Emitter());
        this.onDidChangeState = this._onDidChangeState.event;
        this._editState = CellEditState.Preview;
        this._lineNumbers = 'inherit';
        this._focusMode = CellFocusMode.Container;
        this._editorListeners = [];
        this._editorViewStates = null;
        this._editorTransientState = null;
        this._resolvedCellDecorations = new Map();
        this._textModelRefChangeDisposable = this._register(new MutableDisposable());
        this._cellDecorationsChanged = this._register(new Emitter());
        this.onCellDecorationsChanged = this._cellDecorationsChanged.event;
        this._resolvedDecorations = new Map();
        this._lastDecorationId = 0;
        this._cellStatusBarItems = new Map();
        this._onDidChangeCellStatusBarItems = this._register(new Emitter());
        this.onDidChangeCellStatusBarItems = this._onDidChangeCellStatusBarItems.event;
        this._lastStatusBarId = 0;
        this._dragging = false;
        this._inputCollapsed = false;
        this._outputCollapsed = false;
        this._commentHeight = 0;
        this._isDisposed = false;
        this._isReadonly = false;
        this._editStateSource = '';
        this._register(model.onDidChangeMetadata(() => {
            this._onDidChangeState.fire({ metadataChanged: true });
        }));
        this._register(model.onDidChangeInternalMetadata(e => {
            this._onDidChangeState.fire({ internalMetadataChanged: true });
            if (e.lastRunSuccessChanged) {
                // Statusbar visibility may change
                this.layoutChange({});
            }
        }));
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('notebook.lineNumbers')) {
                this.lineNumbers = 'inherit';
            }
        }));
        if (this.model.collapseState?.inputCollapsed) {
            this._inputCollapsed = true;
        }
        if (this.model.collapseState?.outputCollapsed) {
            this._outputCollapsed = true;
        }
        this._commentOptions = this._configurationService.getValue('editor.comments', { overrideIdentifier: this.language });
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('editor.comments')) {
                this._commentOptions = this._configurationService.getValue('editor.comments', { overrideIdentifier: this.language });
            }
        }));
    }
    updateOptions(e) {
        if (this._textEditor && typeof e.readonly === 'boolean') {
            this._textEditor.updateOptions({ readOnly: e.readonly });
        }
        if (typeof e.readonly === 'boolean') {
            this._isReadonly = e.readonly;
        }
    }
    assertTextModelAttached() {
        if (this.textModel && this._textEditor && this._textEditor.getModel() === this.textModel) {
            return true;
        }
        return false;
    }
    // private handleKeyDown(e: IKeyboardEvent) {
    // 	if (this.viewType === IPYNB_VIEW_TYPE && isWindows && e.ctrlKey && e.keyCode === KeyCode.Enter) {
    // 		this._keymapService.promptKeymapRecommendation();
    // 	}
    // }
    attachTextEditor(editor, estimatedHasHorizontalScrolling) {
        if (!editor.hasModel()) {
            throw new Error('Invalid editor: model is missing');
        }
        if (this._textEditor === editor) {
            if (this._editorListeners.length === 0) {
                this._editorListeners.push(this._textEditor.onDidChangeCursorSelection(() => { this._onDidChangeState.fire({ selectionChanged: true }); }));
                // this._editorListeners.push(this._textEditor.onKeyDown(e => this.handleKeyDown(e)));
                this._onDidChangeState.fire({ selectionChanged: true });
            }
            return;
        }
        this._textEditor = editor;
        if (this._isReadonly) {
            editor.updateOptions({ readOnly: this._isReadonly });
        }
        if (this._editorViewStates) {
            this._restoreViewState(this._editorViewStates);
        }
        else {
            // If no real editor view state was persisted, restore a default state.
            // This forces the editor to measure its content width immediately.
            if (estimatedHasHorizontalScrolling) {
                this._restoreViewState({
                    contributionsState: {},
                    cursorState: [],
                    viewState: {
                        scrollLeft: 0,
                        firstPosition: { lineNumber: 1, column: 1 },
                        firstPositionDeltaTop: this._viewContext.notebookOptions.getLayoutConfiguration().editorTopPadding
                    }
                });
            }
        }
        if (this._editorTransientState) {
            writeTransientState(editor.getModel(), this._editorTransientState, this._codeEditorService);
        }
        if (this._isDisposed) {
            // Restore View State could adjust the editor layout and trigger a list view update. The list view update might then dispose this view model.
            return;
        }
        editor.changeDecorations((accessor) => {
            this._resolvedDecorations.forEach((value, key) => {
                if (key.startsWith('_lazy_')) {
                    // lazy ones
                    const ret = accessor.addDecoration(value.options.range, value.options.options);
                    this._resolvedDecorations.get(key).id = ret;
                }
                else {
                    const ret = accessor.addDecoration(value.options.range, value.options.options);
                    this._resolvedDecorations.get(key).id = ret;
                }
            });
        });
        this._editorListeners.push(editor.onDidChangeCursorSelection(() => { this._onDidChangeState.fire({ selectionChanged: true }); }));
        this._editorListeners.push(this._inlineChatSessionService.onWillStartSession((e) => {
            if (e === this._textEditor && this.textBuffer.getLength() === 0) {
                this.enableAutoLanguageDetection();
            }
        }));
        this._onDidChangeState.fire({ selectionChanged: true });
        this._onDidChangeEditorAttachState.fire();
    }
    detachTextEditor() {
        this.saveViewState();
        this.saveTransientState();
        // decorations need to be cleared first as editors can be resued.
        this._textEditor?.changeDecorations((accessor) => {
            this._resolvedDecorations.forEach(value => {
                const resolvedid = value.id;
                if (resolvedid) {
                    accessor.removeDecoration(resolvedid);
                }
            });
        });
        this._textEditor = undefined;
        dispose(this._editorListeners);
        this._editorListeners = [];
        this._onDidChangeEditorAttachState.fire();
        if (this._textModelRef) {
            this._textModelRef.dispose();
            this._textModelRef = undefined;
        }
        this._textModelRefChangeDisposable.clear();
    }
    getText() {
        return this.model.getValue();
    }
    getAlternativeId() {
        return this.model.alternativeId;
    }
    getTextLength() {
        return this.model.getTextLength();
    }
    enableAutoLanguageDetection() {
        this.model.enableAutoLanguageDetection();
    }
    saveViewState() {
        if (!this._textEditor) {
            return;
        }
        this._editorViewStates = this._textEditor.saveViewState();
    }
    saveTransientState() {
        if (!this._textEditor || !this._textEditor.hasModel()) {
            return;
        }
        this._editorTransientState = readTransientState(this._textEditor.getModel(), this._codeEditorService);
    }
    saveEditorViewState() {
        if (this._textEditor) {
            this._editorViewStates = this._textEditor.saveViewState();
        }
        return this._editorViewStates;
    }
    restoreEditorViewState(editorViewStates, totalHeight) {
        this._editorViewStates = editorViewStates;
    }
    _restoreViewState(state) {
        if (state) {
            this._textEditor?.restoreViewState(state);
        }
    }
    addModelDecoration(decoration) {
        if (!this._textEditor) {
            const id = ++this._lastDecorationId;
            const decorationId = `_lazy_${this.id};${id}`;
            this._resolvedDecorations.set(decorationId, { options: decoration });
            return decorationId;
        }
        let id;
        this._textEditor.changeDecorations((accessor) => {
            id = accessor.addDecoration(decoration.range, decoration.options);
            this._resolvedDecorations.set(id, { id, options: decoration });
        });
        return id;
    }
    removeModelDecoration(decorationId) {
        const realDecorationId = this._resolvedDecorations.get(decorationId);
        if (this._textEditor && realDecorationId && realDecorationId.id !== undefined) {
            this._textEditor.changeDecorations((accessor) => {
                accessor.removeDecoration(realDecorationId.id);
            });
        }
        // lastly, remove all the cache
        this._resolvedDecorations.delete(decorationId);
    }
    deltaModelDecorations(oldDecorations, newDecorations) {
        oldDecorations.forEach(id => {
            this.removeModelDecoration(id);
        });
        const ret = newDecorations.map(option => {
            return this.addModelDecoration(option);
        });
        return ret;
    }
    _removeCellDecoration(decorationId) {
        const options = this._resolvedCellDecorations.get(decorationId);
        this._resolvedCellDecorations.delete(decorationId);
        if (options) {
            for (const existingOptions of this._resolvedCellDecorations.values()) {
                // don't remove decorations that are applied from other entries
                if (options.className === existingOptions.className) {
                    options.className = undefined;
                }
                if (options.outputClassName === existingOptions.outputClassName) {
                    options.outputClassName = undefined;
                }
                if (options.gutterClassName === existingOptions.gutterClassName) {
                    options.gutterClassName = undefined;
                }
                if (options.topClassName === existingOptions.topClassName) {
                    options.topClassName = undefined;
                }
            }
            this._cellDecorationsChanged.fire({ added: [], removed: [options] });
        }
    }
    _addCellDecoration(options) {
        const id = ++this._lastDecorationId;
        const decorationId = `_cell_${this.id};${id}`;
        this._resolvedCellDecorations.set(decorationId, options);
        this._cellDecorationsChanged.fire({ added: [options], removed: [] });
        return decorationId;
    }
    getCellDecorations() {
        return [...this._resolvedCellDecorations.values()];
    }
    getCellDecorationRange(decorationId) {
        if (this._textEditor) {
            // (this._textEditor as CodeEditorWidget).decora
            return this._textEditor.getModel()?.getDecorationRange(decorationId) ?? null;
        }
        return null;
    }
    deltaCellDecorations(oldDecorations, newDecorations) {
        oldDecorations.forEach(id => {
            this._removeCellDecoration(id);
        });
        const ret = newDecorations.map(option => {
            return this._addCellDecoration(option);
        });
        return ret;
    }
    deltaCellStatusBarItems(oldItems, newItems) {
        oldItems.forEach(id => {
            const item = this._cellStatusBarItems.get(id);
            if (item) {
                this._cellStatusBarItems.delete(id);
            }
        });
        const newIds = newItems.map(item => {
            const id = ++this._lastStatusBarId;
            const itemId = `_cell_${this.id};${id}`;
            this._cellStatusBarItems.set(itemId, item);
            return itemId;
        });
        this._onDidChangeCellStatusBarItems.fire();
        return newIds;
    }
    getCellStatusBarItems() {
        return Array.from(this._cellStatusBarItems.values());
    }
    revealRangeInCenter(range) {
        this._textEditor?.revealRangeInCenter(range, 1 /* editorCommon.ScrollType.Immediate */);
    }
    setSelection(range) {
        this._textEditor?.setSelection(range);
    }
    setSelections(selections) {
        if (selections.length) {
            if (this._textEditor) {
                this._textEditor?.setSelections(selections);
            }
            else if (this._editorViewStates) {
                this._editorViewStates.cursorState = selections.map(selection => {
                    return {
                        inSelectionMode: !selection.isEmpty(),
                        selectionStart: selection.getStartPosition(),
                        position: selection.getEndPosition(),
                    };
                });
            }
        }
    }
    getSelections() {
        return this._textEditor?.getSelections()
            ?? this._editorViewStates?.cursorState.map(state => new Selection(state.selectionStart.lineNumber, state.selectionStart.column, state.position.lineNumber, state.position.column))
            ?? [];
    }
    getSelectionsStartPosition() {
        if (this._textEditor) {
            const selections = this._textEditor.getSelections();
            return selections?.map(s => s.getStartPosition());
        }
        else {
            const selections = this._editorViewStates?.cursorState;
            return selections?.map(s => s.selectionStart);
        }
    }
    getLineScrollTopOffset(line) {
        if (!this._textEditor) {
            return 0;
        }
        const editorPadding = this._viewContext.notebookOptions.computeEditorPadding(this.internalMetadata, this.uri);
        return this._textEditor.getTopForLineNumber(line) + editorPadding.top;
    }
    getPositionScrollTopOffset(range) {
        if (!this._textEditor) {
            return 0;
        }
        const position = range instanceof Selection ? range.getPosition() : range.getStartPosition();
        const editorPadding = this._viewContext.notebookOptions.computeEditorPadding(this.internalMetadata, this.uri);
        return this._textEditor.getTopForPosition(position.lineNumber, position.column) + editorPadding.top;
    }
    cursorAtLineBoundary() {
        if (!this._textEditor || !this.textModel || !this._textEditor.hasTextFocus()) {
            return CursorAtLineBoundary.None;
        }
        const selection = this._textEditor.getSelection();
        if (!selection || !selection.isEmpty()) {
            return CursorAtLineBoundary.None;
        }
        const currentLineLength = this.textModel.getLineLength(selection.startLineNumber);
        if (currentLineLength === 0) {
            return CursorAtLineBoundary.Both;
        }
        switch (selection.startColumn) {
            case 1:
                return CursorAtLineBoundary.Start;
            case currentLineLength + 1:
                return CursorAtLineBoundary.End;
            default:
                return CursorAtLineBoundary.None;
        }
    }
    cursorAtBoundary() {
        if (!this._textEditor) {
            return CursorAtBoundary.None;
        }
        if (!this.textModel) {
            return CursorAtBoundary.None;
        }
        // only validate primary cursor
        const selection = this._textEditor.getSelection();
        // only validate empty cursor
        if (!selection || !selection.isEmpty()) {
            return CursorAtBoundary.None;
        }
        const firstViewLineTop = this._textEditor.getTopForPosition(1, 1);
        const lastViewLineTop = this._textEditor.getTopForPosition(this.textModel.getLineCount(), this.textModel.getLineLength(this.textModel.getLineCount()));
        const selectionTop = this._textEditor.getTopForPosition(selection.startLineNumber, selection.startColumn);
        if (selectionTop === lastViewLineTop) {
            if (selectionTop === firstViewLineTop) {
                return CursorAtBoundary.Both;
            }
            else {
                return CursorAtBoundary.Bottom;
            }
        }
        else {
            if (selectionTop === firstViewLineTop) {
                return CursorAtBoundary.Top;
            }
            else {
                return CursorAtBoundary.None;
            }
        }
    }
    get editStateSource() {
        return this._editStateSource;
    }
    updateEditState(newState, source) {
        this._editStateSource = source;
        if (newState === this._editState) {
            return;
        }
        this._editState = newState;
        this._onDidChangeState.fire({ editStateChanged: true });
        if (this._editState === CellEditState.Preview) {
            this.focusMode = CellFocusMode.Container;
        }
    }
    getEditState() {
        return this._editState;
    }
    get textBuffer() {
        return this.model.textBuffer;
    }
    /**
     * Text model is used for editing.
     */
    async resolveTextModel() {
        if (!this._textModelRef || !this.textModel) {
            this._textModelRef = await this._modelService.createModelReference(this.uri);
            if (this._isDisposed) {
                return this.textModel;
            }
            if (!this._textModelRef) {
                throw new Error(`Cannot resolve text model for ${this.uri}`);
            }
            this._textModelRefChangeDisposable.value = this.textModel.onDidChangeContent(() => this.onDidChangeTextModelContent());
        }
        return this.textModel;
    }
    cellStartFind(value, options) {
        let cellMatches = [];
        const lineCount = this.textBuffer.getLineCount();
        const findRange = options.findScope?.selectedTextRanges ?? [new Range(1, 1, lineCount, this.textBuffer.getLineLength(lineCount) + 1)];
        if (this.assertTextModelAttached()) {
            cellMatches = this.textModel.findMatches(value, findRange, options.regex || false, options.caseSensitive || false, options.wholeWord ? options.wordSeparators || null : null, options.regex || false);
        }
        else {
            const searchParams = new SearchParams(value, options.regex || false, options.caseSensitive || false, options.wholeWord ? options.wordSeparators || null : null);
            const searchData = searchParams.parseSearchRequest();
            if (!searchData) {
                return null;
            }
            findRange.forEach(range => {
                cellMatches.push(...this.textBuffer.findMatchesLineByLine(new Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn), searchData, options.regex || false, 1000));
            });
        }
        return cellMatches;
    }
    dispose() {
        this._isDisposed = true;
        super.dispose();
        dispose(this._editorListeners);
        // Only remove the undo redo stack if we map this cell uri to itself
        // If we are not in perCell mode, it will map to the full NotebookDocument and
        // we don't want to remove that entire document undo / redo stack when a cell is deleted
        if (this._undoRedoService.getUriComparisonKey(this.uri) === this.uri.toString()) {
            this._undoRedoService.removeElements(this.uri);
        }
        this._textModelRef?.dispose();
    }
    toJSON() {
        return {
            handle: this.handle
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZUNlbGxWaWV3TW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3TW9kZWwvYmFzZUNlbGxWaWV3TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQTJCLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFILE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUszRCxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRzNFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUlyRixPQUFPLEVBQTJCLGtCQUFrQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDakksT0FBTyxFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQXlCLGdCQUFnQixFQUFFLG9CQUFvQixFQUEwRCxNQUFNLHVCQUF1QixDQUFDO0FBUTVMLE1BQU0sT0FBZ0IsaUJBQWtCLFNBQVEsVUFBVTtJQVF6RCxJQUFJLE1BQU07UUFDVCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO0lBQzFCLENBQUM7SUFDRCxJQUFJLEdBQUc7UUFDTixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQ3ZCLENBQUM7SUFDRCxJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxDQUFDO0lB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