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
var NotebookChatController_1;
import { Dimension, WindowIntervalTimer, getWindow, scheduleAtNextAnimationFrame, trackFocus } from '../../../../../../base/browser/dom.js';
import { DeferredPromise, Queue, createCancelablePromise, disposableTimeout } from '../../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../../base/common/cancellation.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { LRUCache } from '../../../../../../base/common/map.js';
import { Schemas } from '../../../../../../base/common/network.js';
import { MovingAverage } from '../../../../../../base/common/numbers.js';
import { isEqual } from '../../../../../../base/common/resources.js';
import { StopWatch } from '../../../../../../base/common/stopwatch.js';
import { assertType } from '../../../../../../base/common/types.js';
import { URI } from '../../../../../../base/common/uri.js';
import { CodeEditorWidget } from '../../../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { Selection } from '../../../../../../editor/common/core/selection.js';
import { TextEdit } from '../../../../../../editor/common/languages.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { IEditorWorkerService } from '../../../../../../editor/common/services/editorWorker.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { localize } from '../../../../../../nls.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../../../platform/storage/common/storage.js';
import { ChatAgentLocation } from '../../../../chat/common/constants.js';
import { IChatService } from '../../../../chat/common/chatService.js';
import { countWords } from '../../../../chat/common/chatWordCounter.js';
import { InlineChatWidget } from '../../../../inlineChat/browser/inlineChatWidget.js';
import { asProgressiveEdit, performAsyncTextEdit } from '../../../../inlineChat/browser/utils.js';
import { insertCell, runDeleteAction } from '../cellOperations.js';
import { CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_NOTEBOOK_CHAT_HAS_ACTIVE_REQUEST, CTX_NOTEBOOK_CHAT_OUTER_FOCUS_POSITION, CTX_NOTEBOOK_CHAT_USER_DID_EDIT, MENU_CELL_CHAT_WIDGET_STATUS } from './notebookChatContext.js';
import { registerNotebookContribution } from '../../notebookEditorExtensions.js';
import { CellKind } from '../../../common/notebookCommon.js';
import { INotebookExecutionStateService, NotebookExecutionType } from '../../../common/notebookExecutionStateService.js';
class NotebookChatWidget extends Disposable {
    set afterModelPosition(afterModelPosition) {
        this.notebookViewZone.afterModelPosition = afterModelPosition;
    }
    get afterModelPosition() {
        return this.notebookViewZone.afterModelPosition;
    }
    set heightInPx(heightInPx) {
        this.notebookViewZone.heightInPx = heightInPx;
    }
    get heightInPx() {
        return this.notebookViewZone.heightInPx;
    }
    get editingCell() {
        return this._editingCell;
    }
    constructor(_notebookEditor, id, notebookViewZone, domNode, widgetContainer, inlineChatWidget, parentEditor, _languageService) {
        super();
        this._notebookEditor = _notebookEditor;
        this.id = id;
        this.notebookViewZone = notebookViewZone;
        this.domNode = domNode;
        this.widgetContainer = widgetContainer;
        this.inlineChatWidget = inlineChatWidget;
        this.parentEditor = parentEditor;
        this._languageService = _languageService;
        this._editingCell = null;
        const updateHeight = () => {
            if (this.heightInPx === inlineChatWidget.contentHeight) {
                return;
            }
            this.heightInPx = inlineChatWidget.contentHeight;
            this._notebookEditor.changeViewZones(accessor => {
                accessor.layoutZone(id);
            });
            this._layoutWidget(inlineChatWidget, widgetContainer);
        };
        this._register(inlineChatWidget.onDidChangeHeight(() => {
            updateHeight();
        }));
        this._register(inlineChatWidget.chatWidget.onDidChangeHeight(() => {
            updateHeight();
        }));
        this.heightInPx = inlineChatWidget.contentHeight;
        this._layoutWidget(inlineChatWidget, widgetContainer);
    }
    layout() {
        this._layoutWidget(this.inlineChatWidget, this.widgetContainer);
    }
    restoreEditingCell(initEditingCell) {
        this._editingCell = initEditingCell;
        const decorationIds = this._notebookEditor.deltaCellDecorations([], [{
                handle: this._editingCell.handle,
                options: { className: 'nb-chatGenerationHighlight', outputClassName: 'nb-chatGenerationHighlight' }
            }]);
        this._register(toDisposable(() => {
            this._notebookEditor.deltaCellDecorations(decorationIds, []);
        }));
    }
    hasFocus() {
        return this.inlineChatWidget.hasFocus();
    }
    focus() {
        this.updateNotebookEditorFocusNSelections();
        this.inlineChatWidget.focus();
    }
    updateNotebookEditorFocusNSelections() {
        this._notebookEditor.focusContainer(true);
        this._notebookEditor.setFocus({ start: this.afterModelPosition, end: this.afterModelPosition });
        this._notebookEditor.setSelections([{
                start: this.afterModelPosition,
                end: this.afterModelPosition
            }]);
    }
    getEditingCell() {
        return this._editingCell;
    }
    async getOrCreateEditingCell() {
        if (this._editingCell) {
            const codeEditor = this._notebookEditor.codeEditors.find(ce => ce[0] === this._editingCell)?.[1];
            if (codeEditor?.hasModel()) {
                return {
                    cell: this._editingCell,
                    editor: codeEditor
                };
            }
            else {
                return undefined;
            }
        }
        if (!this._notebookEditor.hasModel()) {
            return undefined;
        }
        const widgetHasFocus = this.inlineChatWidget.hasFocus();
        this._editingCell = insertCell(this._languageService, this._notebookEditor, this.afterModelPosition, CellKind.Code, 'above');
        if (!this._editingCell) {
            return undefined;
        }
        await this._notebookEditor.revealFirstLineIfOutsideViewport(this._editingCell);
        // update decoration
        const decorationIds = this._notebookEditor.deltaCellDecorations([], [{
                handle: this._editingCell.handle,
                options: { className: 'nb-chatGenerationHighlight', outputClassName: 'nb-chatGenerationHighlight' }
            }]);
        this._register(toDisposable(() => {
            this._notebookEditor.deltaCellDecorations(decorationIds, []);
        }));
        if (widgetHasFocus) {
            this.focus();
        }
        const codeEditor = this._notebookEditor.codeEditors.find(ce => ce[0] === this._editingCell)?.[1];
        if (codeEditor?.hasModel()) {
            return {
                cell: this._editingCell,
                editor: codeEditor
            };
        }
        return undefined;
    }
    async discardChange() {
        if (this._notebookEditor.hasModel() && this._editingCell) {
            // remove the cell from the notebook
            runDeleteAction(this._notebookEditor, this._editingCell);
        }
    }
    _layoutWidget(inlineChatWidget, widgetContainer) {
        const layoutConfiguration = this._notebookEditor.notebookOptions.getLayoutConfiguration();
        const rightMargin = layoutConfiguration.cellRightMargin;
        const leftMargin = this._notebookEditor.notebookOptions.getCellEditorContainerLeftMargin();
        const maxWidth = 640;
        const width = Math.min(maxWidth, this._notebookEditor.getLayoutInfo().width - leftMargin - rightMargin);
        inlineChatWidget.layout(new Dimension(width, this.heightInPx));
        inlineChatWidget.domNode.style.width = `${width}px`;
        widgetContainer.style.left = `${leftMargin}px`;
    }
    dispose() {
        this._notebookEditor.changeViewZones(accessor => {
            accessor.removeZone(this.id);
        });
        this.domNode.remove();
        super.dispose();
    }
}
class NotebookCellTextModelLikeId {
    static str(k) {
        return `${k.viewType}/${k.uri.toString()}`;
    }
    static obj(s) {
        const idx = s.indexOf('/');
        return {
            viewType: s.substring(0, idx),
            uri: URI.parse(s.substring(idx + 1))
        };
    }
}
let NotebookChatController = class NotebookChatController extends Disposable {
    static { NotebookChatController_1 = this; }
    static { this.id = 'workbench.notebook.chatController'; }
    static { this.counter = 0; }
    static get(editor) {
        return editor.getContribution(NotebookChatController_1.id);
    }
    // History
    static { this._storageKey = 'inline-chat-history'; }
    static { this._promptHistory = []; }
    constructor(_notebookEditor, _instantiationService, _contextKeyService, _editorWorkerService, _modelService, _languageService, _executionStateService, _storageService, _chatService) {
        super();
        this._notebookEditor = _notebookEditor;
        this._instantiationService = _instantiationService;
        this._contextKeyService = _contextKeyService;
        this._editorWorkerService = _editorWorkerService;
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._executionStateService = _executionStateService;
        this._storageService = _storageService;
        this._chatService = _chatService;
        this._historyOffset = -1;
        this._historyCandidate = '';
        this._promptCache = new LRUCache(1000, 0.7);
        this._onDidChangePromptCache = this._register(new Emitter());
        this.onDidChangePromptCache = this._onDidChangePromptCache.event;
        this._userEditingDisposables = this._register(new DisposableStore());
        this._widgetDisposableStore = this._register(new DisposableStore());
        this._model = this._register(new MutableDisposable());
        this._ctxHasActiveRequest = CTX_NOTEBOOK_CHAT_HAS_ACTIVE_REQUEST.bindTo(this._contextKeyService);
        this._ctxCellWidgetFocused = CTX_NOTEBOOK_CELL_CHAT_FOCUSED.bindTo(this._contextKeyService);
        this._ctxUserDidEdit = CTX_NOTEBOOK_CHAT_USER_DID_EDIT.bindTo(this._contextKeyService);
        this._ctxOuterFocusPosition = CTX_NOTEBOOK_CHAT_OUTER_FOCUS_POSITION.bindTo(this._contextKeyService);
        this._registerFocusTracker();
        NotebookChatController_1._promptHistory = JSON.parse(this._storageService.get(NotebookChatController_1._storageKey, 0 /* StorageScope.PROFILE */, '[]'));
        this._historyUpdate = (prompt) => {
            const idx = NotebookChatController_1._promptHistory.indexOf(prompt);
            if (idx >= 0) {
                NotebookChatController_1._promptHistory.splice(idx, 1);
            }
            NotebookChatController_1._promptHistory.unshift(prompt);
            this._historyOffset = -1;
            this._historyCandidate = '';
            this._storageService.store(NotebookChatController_1._storageKey, JSON.stringify(NotebookChatController_1._promptHistory), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        };
    }
    _registerFocusTracker() {
        this._register(this._notebookEditor.onDidChangeFocus(() => {
            if (!this._widget) {
                this._ctxOuterFocusPosition.set('');
                return;
            }
            const widgetIndex = this._widget.afterModelPosition;
            const focus = this._notebookEditor.getFocus().start;
            if (focus + 1 === widgetIndex) {
                this._ctxOuterFocusPosition.set('above');
            }
            else if (focus === widgetIndex) {
                this._ctxOuterFocusPosition.set('below');
            }
            else {
                this._ctxOuterFocusPosition.set('');
            }
        }));
    }
    run(index, input, autoSend) {
        if (this._widget) {
            if (this._widget.afterModelPosition !== index) {
                const window = getWindow(this._widget.domNode);
                this._disposeWidget();
                scheduleAtNextAnimationFrame(window, () => {
                    this._createWidget(index, input, autoSend, undefined);
                });
            }
            return;
        }
        this._createWidget(index, input, autoSend, undefined);
        // TODO: reveal widget to the center if it's out of the viewport
    }
    restore(editingCell, input) {
        if (!this._notebookEditor.hasModel()) {
            return;
        }
        const index = this._notebookEditor.textModel.cells.indexOf(editingCell.model);
        if (index < 0) {
            return;
        }
        if (this._widget) {
            if (this._widget.afterModelPosition !== index) {
                this._disposeWidget();
                const window = getWindow(this._widget.domNode);
                scheduleAtNextAnimationFrame(window, () => {
                    this._createWidget(index, input, false, editingCell);
                });
            }
            return;
        }
        this._createWidget(index, input, false, editingCell);
    }
    _disposeWidget() {
        this._widget?.dispose();
        this._widget = undefined;
        this._widgetDisposableStore.clear();
        this._historyOffset = -1;
        this._historyCandidate = '';
    }
    _createWidget(index, input, autoSend, initEditingCell) {
        if (!this._notebookEditor.hasModel()) {
            return;
        }
        // Clear the widget if it's already there
        this._widgetDisposableStore.clear();
        const viewZoneContainer = document.createElement('div');
        viewZoneContainer.classList.add('monaco-editor');
        const widgetContainer = document.createElement('div');
        widgetContainer.style.position = 'absolute';
        viewZoneContainer.appendChild(widgetContainer);
        this._focusTracker = this._widgetDisposableStore.add(trackFocus(viewZoneContainer));
        this._widgetDisposableStore.add(this._focusTracker.onDidFocus(() => {
            this._updateNotebookEditorFocusNSelections();
        }));
        const fakeParentEditorElement = document.createElement('div');
        const fakeParentEditor = this._widgetDisposableStore.add(this._instantiationService.createInstance(CodeEditorWidget, fakeParentEditorElement, {}, { isSimpleWidget: true }));
        const inputBoxFragment = `notebook-chat-input-${NotebookChatController_1.counter++}`;
        const notebookUri = this._notebookEditor.textModel.uri;
        const inputUri = notebookUri.with({ scheme: Schemas.untitled, fragment: inputBoxFragment });
        const result = this._modelService.createModel('', null, inputUri, false);
        fakeParentEditor.setModel(result);
        const inlineChatWidget = this._widgetDisposableStore.add(this._instantiationService.createInstance(InlineChatWidget, {
            location: ChatAgentLocation.Notebook,
            resolveData: () => {
                const sessionInputUri = this.getSessionInputUri();
                if (!sessionInputUri) {
                    return undefined;
                }
                return {
                    type: ChatAgentLocation.Notebook,
                    sessionInputUri
                };
            }
        }, {
            statusMenuId: MENU_CELL_CHAT_WIDGET_STATUS,
            chatWidgetViewOptions: {
                rendererOptions: {
                    renderTextEditsAsSummary: (uri) => {
                        return isEqual(uri, this._widget?.parentEditor.getModel()?.uri)
                            || isEqual(uri, this._notebookEditor.textModel?.uri);
                    }
                },
                menus: {
                    telemetrySource: 'notebook-generate-cell'
                }
            }
        }));
        inlineChatWidget.placeholder = localize('default.placeholder', "Ask a question");
        inlineChatWidget.updateInfo(localize('welcome.1', "AI-generated code may be incorrect"));
        widgetContainer.appendChild(inlineChatWidget.domNode);
        this._notebookEditor.changeViewZones(accessor => {
            const notebookViewZone = {
                afterModelPosition: index,
                heightInPx: 80,
                domNode: viewZoneContainer
            };
            const id = accessor.addZone(notebookViewZone);
            this._scrollWidgetIntoView(index);
            this._widget = new NotebookChatWidget(this._notebookEditor, id, notebookViewZone, viewZoneContainer, widgetContainer, inlineChatWidget, fakeParentEditor, this._languageService);
            if (initEditingCell) {
                this._widget.restoreEditingCell(initEditingCell);
                this._updateUserEditingState();
            }
            this._ctxCellWidgetFocused.set(true);
            disposableTimeout(() => {
                this._focusWidget();
            }, 0, this._store);
            this._sessionCtor = createCancelablePromise(async (token) => {
                await this._startSession(token);
                assertType(this._model.value);
                const model = this._model.value;
                this._widget?.inlineChatWidget.setChatModel(model);
                if (fakeParentEditor.hasModel()) {
                    if (this._widget) {
                        this._focusWidget();
                    }
                    if (this._widget && input) {
                        this._widget.inlineChatWidget.value = input;
                        if (autoSend) {
                            this.acceptInput();
                        }
                    }
                }
            });
        });
    }
    async _startSession(token) {
        if (!this._model.value) {
            this._model.value = this._chatService.startSession(ChatAgentLocation.Editor, token);
            if (!this._model.value) {
                throw new Error('Failed to start chat session');
            }
        }
        this._strategy = new EditStrategy();
    }
    _scrollWidgetIntoView(index) {
        if (index === 0 || this._notebookEditor.getLength() === 0) {
            // the cell is at the beginning of the notebook
            this._notebookEditor.revealOffsetInCenterIfOutsideViewport(0);
        }
        else {
            // the cell is at the end of the notebook
            const previousCell = this._notebookEditor.cellAt(Math.min(index - 1, this._notebookEditor.getLength() - 1));
            if (previousCell) {
                const cellTop = this._notebookEditor.getAbsoluteTopOfElement(previousCell);
                const cellHeight = this._notebookEditor.getHeightOfElement(previousCell);
                this._notebookEditor.revealOffsetInCenterIfOutsideViewport(cellTop + cellHeight + 48 /** center of the dialog */);
            }
        }
    }
    _focusWidget() {
        if (!this._widget) {
            return;
        }
        this._updateNotebookEditorFocusNSelections();
        this._widget.focus();
    }
    _updateNotebookEditorFocusNSelections() {
        if (!this._widget) {
            return;
        }
        this._widget.updateNotebookEditorFocusNSelections();
    }
    hasSession(chatModel) {
        return this._model.value === chatModel;
    }
    getSessionInputUri() {
        return this._widget?.parentEditor.getModel()?.uri;
    }
    async acceptInput() {
        assertType(this._widget);
        await this._sessionCtor;
        assertType(this._model.value);
        assertType(this._strategy);
        const lastInput = this._widget.inlineChatWidget.value;
        this._historyUpdate(lastInput);
        const editor = this._widget.parentEditor;
        const textModel = editor.getModel();
        if (!editor.hasModel() || !textModel) {
            return;
        }
        if (this._widget.editingCell && this._widget.editingCell.textBuffer.getLength() > 0) {
            // it already contains some text, clear it
            const ref = await this._widget.editingCell.resolveTextModel();
            ref.setValue('');
        }
        const editingCellIndex = this._widget.editingCell ? this._notebookEditor.getCellIndex(this._widget.editingCell) : undefined;
        if (editingCellIndex !== undefined) {
            this._notebookEditor.setSelections([{
                    start: editingCellIndex,
                    end: editingCellIndex + 1
                }]);
        }
        else {
            // Update selection to the widget index
            this._notebookEditor.setSelections([{
                    start: this._widget.afterModelPosition,
                    end: this._widget.afterModelPosition
                }]);
        }
        this._ctxHasActiveRequest.set(true);
        this._activeRequestCts?.cancel();
        this._activeRequestCts = new CancellationTokenSource();
        const store = new DisposableStore();
        try {
            this._ctxHasActiveRequest.set(true);
            const progressiveEditsQueue = new Queue();
            const progressiveEditsClock = StopWatch.create();
            const progressiveEditsAvgDuration = new MovingAverage();
            const progressiveEditsCts = new CancellationTokenSource(this._activeRequestCts.token);
            const responsePromise = new DeferredPromise();
            const response = await this._widget.inlineChatWidget.chatWidget.acceptInput();
            if (response) {
                let lastLength = 0;
                store.add(response.onDidChange(e => {
                    if (response.isCanceled) {
                        progressiveEditsCts.cancel();
                        responsePromise.complete();
                        return;
                    }
                    if (response.isComplete) {
                        responsePromise.complete();
                        return;
                    }
                    const edits = response.response.value.map(part => {
                        if (part.kind === 'textEditGroup'
                        // && isEqual(part.uri, this._session?.textModelN.uri)
                        ) {
                            return part.edits;
                        }
                        else {
                            return [];
                        }
                    }).flat();
                    const newEdits = edits.slice(lastLength);
                    // console.log('NEW edits', newEdits, edits);
                    if (newEdits.length === 0) {
                        return; // NO change
                    }
                    lastLength = edits.length;
                    progressiveEditsAvgDuration.update(progressiveEditsClock.elapsed());
                    progressiveEditsClock.reset();
                    progressiveEditsQueue.queue(async () => {
                        for (const edits of newEdits) {
                            await this._makeChanges(edits, {
                                duration: progressiveEditsAvgDuration.value,
                                token: progressiveEditsCts.token
                            });
                        }
                    });
                }));
            }
            await responsePromise.p;
            await progressiveEditsQueue.whenIdle();
            this._userEditingDisposables.clear();
            // monitor user edits
            const editingCell = this._widget.getEditingCell();
            if (editingCell) {
                this._userEditingDisposables.add(editingCell.model.onDidChangeContent(() => this._updateUserEditingState()));
                this._userEditingDisposables.add(editingCell.model.onDidChangeLanguage(() => this._updateUserEditingState()));
                this._userEditingDisposables.add(editingCell.model.onDidChangeMetadata(() => this._updateUserEditingState()));
                this._userEditingDisposables.add(editingCell.model.onDidChangeInternalMetadata(() => this._updateUserEditingState()));
                this._userEditingDisposables.add(editingCell.model.onDidChangeOutputs(() => this._updateUserEditingState()));
                this._userEditingDisposables.add(this._executionStateService.onDidChangeExecution(e => {
                    if (e.type === NotebookExecutionType.cell && e.affectsCell(editingCell.uri)) {
                        this._updateUserEditingState();
                    }
                }));
            }
        }
        catch (e) {
        }
        finally {
            store.dispose();
            this._ctxHasActiveRequest.set(false);
            this._widget.inlineChatWidget.updateInfo('');
            this._widget.inlineChatWidget.updateToolbar(true);
        }
    }
    async _makeChanges(edits, opts) {
        assertType(this._strategy);
        assertType(this._widget);
        const editingCell = await this._widget.getOrCreateEditingCell();
        if (!editingCell) {
            return;
        }
        const editor = editingCell.editor;
        const moreMinimalEdits = await this._editorWorkerService.computeMoreMinimalEdits(editor.getModel().uri, edits);
        // this._log('edits from PROVIDER and after making them MORE MINIMAL', this._activeSession.provider.debugName, edits, moreMinimalEdits);
        if (moreMinimalEdits?.length === 0) {
            // nothing left to do
            return;
        }
        const actualEdits = !opts && moreMinimalEdits ? moreMinimalEdits : edits;
        const editOperations = actualEdits.map(TextEdit.asEditOperation);
        try {
            if (opts) {
                await this._strategy.makeProgressiveChanges(editor, editOperations, opts);
            }
            else {
                await this._strategy.makeChanges(editor, editOperations);
            }
        }
        finally {
        }
    }
    _updateUserEditingState() {
        this._ctxUserDidEdit.set(true);
    }
    async acceptSession() {
        assertType(this._model);
        assertType(this._strategy);
        const editor = this._widget?.parentEditor;
        if (!editor?.hasModel()) {
            return;
        }
        const editingCell = this._widget?.getEditingCell();
        if (editingCell && this._notebookEditor.hasModel()) {
            const cellId = NotebookCellTextModelLikeId.str({ uri: editingCell.uri, viewType: this._notebookEditor.textModel.viewType });
            if (this._widget?.inlineChatWidget.value) {
                this._promptCache.set(cellId, this._widget.inlineChatWidget.value);
            }
            this._onDidChangePromptCache.fire({ cell: editingCell.uri });
        }
        try {
            this._model.clear();
        }
        catch (_err) { }
        this.dismiss(false);
    }
    async focusAbove() {
        if (!this._widget) {
            return;
        }
        const index = this._widget.afterModelPosition;
        const prev = index - 1;
        if (prev < 0) {
            return;
        }
        const cell = this._notebookEditor.cellAt(prev);
        if (!cell) {
            return;
        }
        await this._notebookEditor.focusNotebookCell(cell, 'editor');
    }
    async focusNext() {
        if (!this._widget) {
            return;
        }
        const index = this._widget.afterModelPosition;
        const cell = this._notebookEditor.cellAt(index);
        if (!cell) {
            return;
        }
        await this._notebookEditor.focusNotebookCell(cell, 'editor');
    }
    hasFocus() {
        return this._widget?.hasFocus() ?? false;
    }
    focus() {
        this._focusWidget();
    }
    focusNearestWidget(index, direction) {
        switch (direction) {
            case 'above':
                if (this._widget?.afterModelPosition === index) {
                    this._focusWidget();
                }
                break;
            case 'below':
                if (this._widget?.afterModelPosition === index + 1) {
                    this._focusWidget();
                }
                break;
            default:
                break;
        }
    }
    populateHistory(up) {
        if (!this._widget) {
            return;
        }
        const len = NotebookChatController_1._promptHistory.length;
        if (len === 0) {
            return;
        }
        if (this._historyOffset === -1) {
            // remember the current value
            this._historyCandidate = this._widget.inlineChatWidget.value;
        }
        const newIdx = this._historyOffset + (up ? 1 : -1);
        if (newIdx >= len) {
            // reached the end
            return;
        }
        let entry;
        if (newIdx < 0) {
            entry = this._historyCandidate;
            this._historyOffset = -1;
        }
        else {
            entry = NotebookChatController_1._promptHistory[newIdx];
            this._historyOffset = newIdx;
        }
        this._widget.inlineChatWidget.value = entry;
        this._widget.inlineChatWidget.selectAll();
    }
    async cancelCurrentRequest(discard) {
        this._activeRequestCts?.cancel();
    }
    getEditingCell() {
        return this._widget?.getEditingCell();
    }
    discard() {
        this._activeRequestCts?.cancel();
        this._widget?.discardChange();
        this.dismiss(true);
    }
    dismiss(discard) {
        const widget = this._widget;
        const widgetIndex = widget?.afterModelPosition;
        const currentFocus = this._notebookEditor.getFocus();
        const isWidgetFocused = currentFocus.start === widgetIndex && currentFocus.end === widgetIndex;
        if (widget && isWidgetFocused) {
            // change focus only when the widget is focused
            const editingCell = widget.getEditingCell();
            const shouldFocusEditingCell = editingCell && !discard;
            const shouldFocusTopCell = widgetIndex === 0 && this._notebookEditor.getLength() > 0;
            const shouldFocusAboveCell = widgetIndex !== 0 && this._notebookEditor.cellAt(widgetIndex - 1);
            if (shouldFocusEditingCell) {
                this._notebookEditor.focusNotebookCell(editingCell, 'container');
            }
            else if (shouldFocusTopCell) {
                this._notebookEditor.focusNotebookCell(this._notebookEditor.cellAt(0), 'container');
            }
            else if (shouldFocusAboveCell) {
                this._notebookEditor.focusNotebookCell(this._notebookEditor.cellAt(widgetIndex - 1), 'container');
            }
        }
        this._ctxCellWidgetFocused.set(false);
        this._ctxUserDidEdit.set(false);
        this._sessionCtor?.cancel();
        this._sessionCtor = undefined;
        this._model.clear();
        this._widget?.dispose();
        this._widget = undefined;
        this._widgetDisposableStore.clear();
    }
    // check if a cell is generated by prompt by checking prompt cache
    isCellGeneratedByChat(cell) {
        if (!this._notebookEditor.hasModel()) {
            // no model attached yet
            return false;
        }
        const cellId = NotebookCellTextModelLikeId.str({ uri: cell.uri, viewType: this._notebookEditor.textModel.viewType });
        return this._promptCache.has(cellId);
    }
    // get prompt from cache
    getPromptFromCache(cell) {
        if (!this._notebookEditor.hasModel()) {
            // no model attached yet
            return undefined;
        }
        const cellId = NotebookCellTextModelLikeId.str({ uri: cell.uri, viewType: this._notebookEditor.textModel.viewType });
        return this._promptCache.get(cellId);
    }
    dispose() {
        this.dismiss(false);
        super.dispose();
    }
};
NotebookChatController = NotebookChatController_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IContextKeyService),
    __param(3, IEditorWorkerService),
    __param(4, IModelService),
    __param(5, ILanguageService),
    __param(6, INotebookExecutionStateService),
    __param(7, IStorageService),
    __param(8, IChatService)
], NotebookChatController);
export { NotebookChatController };
export class EditStrategy {
    constructor() {
        this._editCount = 0;
    }
    async makeProgressiveChanges(editor, edits, opts) {
        // push undo stop before first edit
        if (++this._editCount === 1) {
            editor.pushUndoStop();
        }
        const durationInSec = opts.duration / 1000;
        for (const edit of edits) {
            const wordCount = countWords(edit.text ?? '');
            const speed = wordCount / durationInSec;
            // console.log({ durationInSec, wordCount, speed: wordCount / durationInSec });
            await performAsyncTextEdit(editor.getModel(), asProgressiveEdit(new WindowIntervalTimer(), edit, speed, opts.token));
        }
    }
    async makeChanges(editor, edits) {
        const cursorStateComputerAndInlineDiffCollection = (undoEdits) => {
            let last = null;
            for (const edit of undoEdits) {
                last = !last || last.isBefore(edit.range.getEndPosition()) ? edit.range.getEndPosition() : last;
                // this._inlineDiffDecorations.collectEditOperation(edit);
            }
            return last && [Selection.fromPositions(last)];
        };
        // push undo stop before first edit
        if (++this._editCount === 1) {
            editor.pushUndoStop();
        }
        editor.executeEdits('inline-chat-live', edits, cursorStateComputerAndInlineDiffCollection);
    }
}
registerNotebookContribution(NotebookChatController.id, NotebookChatController);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDaGF0Q29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJvbGxlci9jaGF0L25vdGVib29rQ2hhdENvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQWlCLG1CQUFtQixFQUFFLFNBQVMsRUFBRSw0QkFBNEIsRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMzSixPQUFPLEVBQXFCLGVBQWUsRUFBRSxLQUFLLEVBQUUsdUJBQXVCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUMvSSxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDM0csT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUUzRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUcxRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDOUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRXpGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDcEQsT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0csT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxzREFBc0QsQ0FBQztBQUNwSCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUV6RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDdEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRXhFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDbkUsT0FBTyxFQUFFLDhCQUE4QixFQUFFLG9DQUFvQyxFQUFFLHNDQUFzQyxFQUFFLCtCQUErQixFQUFFLDRCQUE0QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFdk4sT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDakYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRXpILE1BQU0sa0JBQW1CLFNBQVEsVUFBVTtJQUMxQyxJQUFJLGtCQUFrQixDQUFDLGtCQUEwQjtRQUNoRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLEdBQUcsa0JBQWtCLENBQUM7SUFDL0QsQ0FBQztJQUVELElBQUksa0JBQWtCO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDO0lBQ2pELENBQUM7SUFFRCxJQUFJLFVBQVUsQ0FBQyxVQUFrQjtRQUNoQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztJQUMvQyxDQUFDO0lBRUQsSUFBSSxVQUFVO1FBQ2IsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDO0lBQ3pDLENBQUM7SUFJRCxJQUFJLFdBQVc7UUFDZCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7SUFDMUIsQ0FBQztJQUVELFlBQ2tCLGVBQWdDLEVBQ3hDLEVBQVUsRUFDVixnQkFBbUMsRUFDbkMsT0FBb0IsRUFDcEIsZUFBNEIsRUFDNUIsZ0JBQWtDLEVBQ2xDLFlBQThCLEVBQ3RCLGdCQUFrQztRQUVuRCxLQUFLLEVBQUUsQ0FBQztRQVRTLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUN4QyxPQUFFLEdBQUYsRUFBRSxDQUFRO1FBQ1YscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUNuQyxZQUFPLEdBQVAsT0FBTyxDQUFhO1FBQ3BCLG9CQUFlLEdBQWYsZUFBZSxDQUFhO1FBQzVCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFDbEMsaUJBQVksR0FBWixZQUFZLENBQWtCO1FBQ3RCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFkNUMsaUJBQVksR0FBMEIsSUFBSSxDQUFDO1FBa0JsRCxNQUFNLFlBQVksR0FBRyxHQUFHLEVBQUU7WUFDekIsSUFBSSxJQUFJLENBQUMsVUFBVSxLQUFLLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUN4RCxPQUFPO1lBQ1IsQ0FBQztZQUVELElBQUksQ0FBQyxVQUFVLEdBQUcsZ0JBQWdCLENBQUMsYUFBYSxDQUFDO1lBQ2pELElBQUksQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUMvQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3pCLENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUN2RCxDQUFDLENBQUM7UUFFRixJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRTtZQUN0RCxZQUFZLEVBQUUsQ0FBQztRQUNoQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFO1lBQ2pFLFlBQVksRUFBRSxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsVUFBVSxHQUFHLGdCQUFnQixDQUFDLGFBQWEsQ0FBQztRQUNqRCxJQUFJLENBQUMsYUFBYSxDQUFDLGdCQUFnQixFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFRCxNQUFNO1FBQ0wsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ2pFLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxlQUErQjtRQUNqRCxJQUFJLENBQUMsWUFBWSxHQUFHLGVBQWUsQ0FBQztRQUVwQyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNwRSxNQUFNLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNO2dCQUNoQyxPQUFPLEVBQUUsRUFBRSxTQUFTLEVBQUUsNEJBQTRCLEVBQUUsZUFBZSxFQUFFLDRCQUE0QixFQUFFO2FBQ25HLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ2hDLElBQUksQ0FBQyxlQUFlLENBQUMsb0JBQW9CLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzlELENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsUUFBUTtRQUNQLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ3pDLENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLG9DQUFvQyxFQUFFLENBQUM7UUFDNUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxDQUFDO0lBQy9CLENBQUM7SUFFRCxvQ0FBb0M7UUFDbkMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO1FBQ2hHLElBQUksQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQ25DLEtBQUssRUFBRSxJQUFJLENBQUMsa0JBQWtCO2dCQUM5QixHQUFHLEVBQUUsSUFBSSxDQUFDLGtCQUFrQjthQUM1QixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxjQUFjO1FBQ2IsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQzFCLENBQUM7SUFFRCxLQUFLLENBQUMsc0JBQXNCO1FBQzNCLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqRyxJQUFJLFVBQVUsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDO2dCQUM1QixPQUFPO29CQUNOLElBQUksRUFBRSxJQUFJLENBQUMsWUFBWTtvQkFDdkIsTUFBTSxFQUFFLFVBQVU7aUJBQ2xCLENBQUM7WUFDSCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxTQUFTLENBQUM7WUFDbEIsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLENBQUM7UUFFeEQsSUFBSSxDQUFDLFlBQVksR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFN0gsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN4QixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLGdDQUFnQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUUvRSxvQkFBb0I7UUFDcEIsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDcEUsTUFBTSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTTtnQkFDaEMsT0FBTyxFQUFFLEVBQUUsU0FBUyxFQUFFLDRCQUE0QixFQUFFLGVBQWUsRUFBRSw0QkFBNEIsRUFBRTthQUNuRyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUNoQyxJQUFJLENBQUMsZUFBZSxDQUFDLG9CQUFvQixDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM5RCxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDZCxDQUFDO1FBRUQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pHLElBQUksVUFBVSxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDNUIsT0FBTztnQkFDTixJQUFJLEVBQUUsSUFBSSxDQUFDLFlBQVk7Z0JBQ3ZCLE1BQU0sRUFBRSxVQUFVO2FBQ2xCLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhO1FBQ2xCLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDMUQsb0NBQW9DO1lBQ3BDLGVBQWUsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMxRCxDQUFDO0lBQ0YsQ0FBQztJQUVPLGFBQWEsQ0FBQyxnQkFBa0MsRUFBRSxlQUE0QjtRQUNyRixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLHNCQUFzQixFQUFFLENBQUM7UUFDMUYsTUFBTSxXQUFXLEdBQUcsbUJBQW1CLENBQUMsZUFBZSxDQUFDO1FBQ3hELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLGdDQUFnQyxFQUFFLENBQUM7UUFDM0YsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDO1FBQ3JCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsYUFBYSxFQUFFLENBQUMsS0FBSyxHQUFHLFVBQVUsR0FBRyxXQUFXLENBQUMsQ0FBQztRQUV4RyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQy9ELGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLEdBQUcsS0FBSyxJQUFJLENBQUM7UUFDcEQsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsR0FBRyxVQUFVLElBQUksQ0FBQztJQUNoRCxDQUFDO0lBRVEsT0FBTztRQUNmLElBQUksQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQy9DLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzlCLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUN0QixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDakIsQ0FBQztDQUNEO0FBR0QsTUFBTSwyQkFBMkI7SUFDaEMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUE2QjtRQUN2QyxPQUFPLEdBQUcsQ0FBQyxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7SUFDNUMsQ0FBQztJQUNELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBUztRQUNuQixNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzNCLE9BQU87WUFDTixRQUFRLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDO1lBQzdCLEdBQUcsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQ3BDLENBQUM7SUFDSCxDQUFDO0NBQ0Q7QUFFTSxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUF1QixTQUFRLFVBQVU7O2FBQzlDLE9BQUUsR0FBVyxtQ0FBbUMsQUFBOUMsQ0FBK0M7YUFDakQsWUFBTyxHQUFXLENBQUMsQUFBWixDQUFhO0lBRXBCLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBdUI7UUFDeEMsT0FBTyxNQUFNLENBQUMsZUFBZSxDQUF5Qix3QkFBc0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNsRixDQUFDO0lBRUQsVUFBVTthQUNLLGdCQUFXLEdBQUcscUJBQXFCLEFBQXhCLENBQXlCO2FBQ3BDLG1CQUFjLEdBQWEsRUFBRSxBQUFmLENBQWdCO0lBcUI3QyxZQUNrQixlQUFnQyxFQUMxQixxQkFBNkQsRUFDaEUsa0JBQXVELEVBQ3JELG9CQUEyRCxFQUNsRSxhQUE2QyxFQUMxQyxnQkFBbUQsRUFDckMsc0JBQThELEVBQzdFLGVBQWlELEVBQ3BELFlBQTJDO1FBRXpELEtBQUssRUFBRSxDQUFDO1FBVlMsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQ1QsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUMvQyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBQ3BDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBc0I7UUFDakQsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFDekIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUM3QiwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQWdDO1FBQzVELG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUNuQyxpQkFBWSxHQUFaLFlBQVksQ0FBYztRQTdCbEQsbUJBQWMsR0FBVyxDQUFDLENBQUMsQ0FBQztRQUM1QixzQkFBaUIsR0FBVyxFQUFFLENBQUM7UUFFL0IsaUJBQVksR0FBRyxJQUFJLFFBQVEsQ0FBaUIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzlDLDRCQUF1QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQWlCLENBQUMsQ0FBQztRQUMvRSwyQkFBc0IsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDO1FBU3BELDRCQUF1QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFDO1FBQ2hFLDJCQUFzQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFDO1FBSS9ELFdBQU0sR0FBaUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMsQ0FBQztRQWEvRixJQUFJLENBQUMsb0JBQW9CLEdBQUcsb0NBQW9DLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ2pHLElBQUksQ0FBQyxxQkFBcUIsR0FBRyw4QkFBOEIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDNUYsSUFBSSxDQUFDLGVBQWUsR0FBRywrQkFBK0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDdkYsSUFBSSxDQUFDLHNCQUFzQixHQUFHLHNDQUFzQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUVyRyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUU3Qix3QkFBc0IsQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyx3QkFBc0IsQ0FBQyxXQUFXLGdDQUF3QixJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzdJLElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxNQUFjLEVBQUUsRUFBRTtZQUN4QyxNQUFNLEdBQUcsR0FBRyx3QkFBc0IsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2xFLElBQUksR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNkLHdCQUFzQixDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3RELENBQUM7WUFDRCx3QkFBc0IsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3RELElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDekIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyx3QkFBc0IsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyx3QkFBc0IsQ0FBQyxjQUFjLENBQUMsMkRBQTJDLENBQUM7UUFDakssQ0FBQyxDQUFDO0lBQ0gsQ0FBQztJQUVPLHFCQUFxQjtRQUM1QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFO1lBQ3pELElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ25CLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3BDLE9BQU87WUFDUixDQUFDO1lBRUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztZQUNwRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQztZQUVwRCxJQUFJLEtBQUssR0FBRyxDQUFDLEtBQUssV0FBVyxFQUFFLENBQUM7Z0JBQy9CLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDMUMsQ0FBQztpQkFBTSxJQUFJLEtBQUssS0FBSyxXQUFXLEVBQUUsQ0FBQztnQkFDbEMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMxQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNyQyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxHQUFHLENBQUMsS0FBYSxFQUFFLEtBQXlCLEVBQUUsUUFBNkI7UUFDMUUsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEIsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixLQUFLLEtBQUssRUFBRSxDQUFDO2dCQUMvQyxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDL0MsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUV0Qiw0QkFBNEIsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFO29CQUN6QyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUN2RCxDQUFDLENBQUMsQ0FBQztZQUNKLENBQUM7WUFFRCxPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDdEQsZ0VBQWdFO0lBQ2pFLENBQUM7SUFFRCxPQUFPLENBQUMsV0FBMkIsRUFBRSxLQUFhO1FBQ2pELElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDdEMsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUU5RSxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNmLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEIsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixLQUFLLEtBQUssRUFBRSxDQUFDO2dCQUMvQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQ3RCLE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUUvQyw0QkFBNEIsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFO29CQUN6QyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFDO2dCQUN0RCxDQUFDLENBQUMsQ0FBQztZQUNKLENBQUM7WUFFRCxPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVPLGNBQWM7UUFDckIsSUFBSSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQztRQUN4QixJQUFJLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQztRQUN6QixJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFcEMsSUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN6QixJQUFJLENBQUMsaUJBQWlCLEdBQUcsRUFBRSxDQUFDO0lBQzdCLENBQUM7SUFHTyxhQUFhLENBQUMsS0FBYSxFQUFFLEtBQXlCLEVBQUUsUUFBNkIsRUFBRSxlQUEyQztRQUN6SSxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE9BQU87UUFDUixDQUFDO1FBRUQseUNBQXlDO1FBQ3pDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUVwQyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEQsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNqRCxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3RELGVBQWUsQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLFVBQVUsQ0FBQztRQUM1QyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLENBQUM7UUFFL0MsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7UUFDcEYsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDbEUsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLENBQUM7UUFDOUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLE1BQU0sdUJBQXVCLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUU5RCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FDakcsZ0JBQWdCLEVBQ2hCLHVCQUF1QixFQUN2QixFQUNDLEVBQ0QsRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLENBQ3hCLENBQUMsQ0FBQztRQUVILE1BQU0sZ0JBQWdCLEdBQUcsdUJBQXVCLHdCQUFzQixDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7UUFDbkYsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDO1FBQ3ZELE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO1FBQzVGLE1BQU0sTUFBTSxHQUFlLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3JGLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVsQyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FDakcsZ0JBQWdCLEVBQ2hCO1lBQ0MsUUFBUSxFQUFFLGlCQUFpQixDQUFDLFFBQVE7WUFDcEMsV0FBVyxFQUFFLEdBQUcsRUFBRTtnQkFDakIsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7Z0JBQ2xELElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztvQkFDdEIsT0FBTyxTQUFTLENBQUM7Z0JBQ2xCLENBQUM7Z0JBQ0QsT0FBTztvQkFDTixJQUFJLEVBQUUsaUJBQWlCLENBQUMsUUFBUTtvQkFDaEMsZUFBZTtpQkFDZixDQUFDO1lBQ0gsQ0FBQztTQUNELEVBQ0Q7WUFDQyxZQUFZLEVBQUUsNEJBQTRCO1lBQzFDLHFCQUFxQixFQUFFO2dCQUN0QixlQUFlLEVBQUU7b0JBQ2hCLHdCQUF3QixFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7d0JBQ2pDLE9BQU8sT0FBTyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLENBQUM7K0JBQzNELE9BQU8sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUM7b0JBQ3ZELENBQUM7aUJBQ0Q7Z0JBQ0QsS0FBSyxFQUFFO29CQUNOLGVBQWUsRUFBRSx3QkFBd0I7aUJBQ3pDO2FBQ0Q7U0FDRCxDQUNELENBQUMsQ0FBQztRQUNILGdCQUFnQixDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMscUJBQXFCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUNqRixnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxvQ0FBb0MsQ0FBQyxDQUFDLENBQUM7UUFDekYsZUFBZSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUd0RCxJQUFJLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUMvQyxNQUFNLGdCQUFnQixHQUFHO2dCQUN4QixrQkFBa0IsRUFBRSxLQUFLO2dCQUN6QixVQUFVLEVBQUUsRUFBRTtnQkFDZCxPQUFPLEVBQUUsaUJBQWlCO2FBQzFCLENBQUM7WUFFRixNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDOUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRWxDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxrQkFBa0IsQ0FDcEMsSUFBSSxDQUFDLGVBQWUsRUFDcEIsRUFBRSxFQUNGLGdCQUFnQixFQUNoQixpQkFBaUIsRUFDakIsZUFBZSxFQUNmLGdCQUFnQixFQUNoQixnQkFBZ0IsRUFDaEIsSUFBSSxDQUFDLGdCQUFnQixDQUNyQixDQUFDO1lBRUYsSUFBSSxlQUFlLEVBQUUsQ0FBQztnQkFDckIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztnQkFDakQsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDaEMsQ0FBQztZQUVELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFckMsaUJBQWlCLENBQUMsR0FBRyxFQUFFO2dCQUN0QixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDckIsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFbkIsSUFBSSxDQUFDLFlBQVksR0FBRyx1QkFBdUIsQ0FBTyxLQUFLLEVBQUMsS0FBSyxFQUFDLEVBQUU7Z0JBQy9ELE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDaEMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQzlCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO2dCQUNoQyxJQUFJLENBQUMsT0FBTyxFQUFFLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFFbkQsSUFBSSxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO29CQUVqQyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzt3QkFDbEIsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO29CQUNyQixDQUFDO29CQUVELElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxLQUFLLEVBQUUsQ0FBQzt3QkFDM0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO3dCQUU1QyxJQUFJLFFBQVEsRUFBRSxDQUFDOzRCQUNkLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQzt3QkFDcEIsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLEtBQUssQ0FBQyxhQUFhLENBQUMsS0FBd0I7UUFDbkQsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBRXBGLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLDhCQUE4QixDQUFDLENBQUM7WUFDakQsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7SUFDckMsQ0FBQztJQUVPLHFCQUFxQixDQUFDLEtBQWE7UUFDMUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDM0QsK0NBQStDO1lBQy9DLElBQUksQ0FBQyxlQUFlLENBQUMscUNBQXFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0QsQ0FBQzthQUFNLENBQUM7WUFDUCx5Q0FBeUM7WUFDekMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1RyxJQUFJLFlBQVksRUFBRSxDQUFDO2dCQUNsQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLHVCQUF1QixDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUMzRSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUV6RSxJQUFJLENBQUMsZUFBZSxDQUFDLHFDQUFxQyxDQUFDLE9BQU8sR0FBRyxVQUFVLEdBQUcsRUFBRSxDQUFDLDJCQUEyQixDQUFDLENBQUM7WUFDbkgsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sWUFBWTtRQUNuQixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25CLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLENBQUM7UUFDN0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN0QixDQUFDO0lBRU8scUNBQXFDO1FBQzVDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkIsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLG9DQUFvQyxFQUFFLENBQUM7SUFDckQsQ0FBQztJQUVELFVBQVUsQ0FBQyxTQUFxQjtRQUMvQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxLQUFLLFNBQVMsQ0FBQztJQUN4QyxDQUFDO0lBRUQsa0JBQWtCO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsUUFBUSxFQUFFLEVBQUUsR0FBRyxDQUFDO0lBQ25ELENBQUM7SUFFRCxLQUFLLENBQUMsV0FBVztRQUNoQixVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3pCLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQztRQUN4QixVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM5QixVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRTNCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDO1FBQ3RELElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFL0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUM7UUFDekMsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBRXBDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN0QyxPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3JGLDBDQUEwQztZQUMxQyxNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDOUQsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNsQixDQUFDO1FBRUQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQzVILElBQUksZ0JBQWdCLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDcEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsQ0FBQztvQkFDbkMsS0FBSyxFQUFFLGdCQUFnQjtvQkFDdkIsR0FBRyxFQUFFLGdCQUFnQixHQUFHLENBQUM7aUJBQ3pCLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQzthQUFNLENBQUM7WUFDUCx1Q0FBdUM7WUFDdkMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsQ0FBQztvQkFDbkMsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsa0JBQWtCO29CQUN0QyxHQUFHLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0I7aUJBQ3BDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFcEMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLE1BQU0sRUFBRSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUM7UUFFdkQsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUVwQyxJQUFJLENBQUM7WUFDSixJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRXBDLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQyxNQUFNLHFCQUFxQixHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqRCxNQUFNLDJCQUEyQixHQUFHLElBQUksYUFBYSxFQUFFLENBQUM7WUFDeEQsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLHVCQUF1QixDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUV0RixNQUFNLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBUSxDQUFDO1lBQ3BELE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDOUUsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDZCxJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUM7Z0JBRW5CLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRTtvQkFDbEMsSUFBSSxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUM7d0JBQ3pCLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxDQUFDO3dCQUM3QixlQUFlLENBQUMsUUFBUSxFQUFFLENBQUM7d0JBQzNCLE9BQU87b0JBQ1IsQ0FBQztvQkFFRCxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQzt3QkFDekIsZUFBZSxDQUFDLFFBQVEsRUFBRSxDQUFDO3dCQUMzQixPQUFPO29CQUNSLENBQUM7b0JBRUQsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO3dCQUNoRCxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssZUFBZTt3QkFDaEMsc0RBQXNEOzBCQUNyRCxDQUFDOzRCQUNGLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQzt3QkFDbkIsQ0FBQzs2QkFBTSxDQUFDOzRCQUNQLE9BQU8sRUFBRSxDQUFDO3dCQUNYLENBQUM7b0JBQ0YsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBRVYsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDekMsNkNBQTZDO29CQUM3QyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7d0JBQzNCLE9BQU8sQ0FBQyxZQUFZO29CQUNyQixDQUFDO29CQUNELFVBQVUsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO29CQUMxQiwyQkFBMkIsQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztvQkFDcEUscUJBQXFCLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBRTlCLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTt3QkFDdEMsS0FBSyxNQUFNLEtBQUssSUFBSSxRQUFRLEVBQUUsQ0FBQzs0QkFDOUIsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRTtnQ0FDOUIsUUFBUSxFQUFFLDJCQUEyQixDQUFDLEtBQUs7Z0NBQzNDLEtBQUssRUFBRSxtQkFBbUIsQ0FBQyxLQUFLOzZCQUNoQyxDQUFDLENBQUM7d0JBQ0osQ0FBQztvQkFDRixDQUFDLENBQUMsQ0FBQztnQkFDSixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztZQUVELE1BQU0sZUFBZSxDQUFDLENBQUMsQ0FBQztZQUN4QixNQUFNLHFCQUFxQixDQUFDLFFBQVEsRUFBRSxDQUFDO1lBRXZDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNyQyxxQkFBcUI7WUFDckIsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNsRCxJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUNqQixJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUM3RyxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUM5RyxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUM5RyxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsMkJBQTJCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUN0SCxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUM3RyxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtvQkFDckYsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLHFCQUFxQixDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO3dCQUM3RSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztvQkFDaEMsQ0FBQztnQkFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztRQUNGLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ2IsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBRWhCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDckMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDN0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkQsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsWUFBWSxDQUFDLEtBQWlCLEVBQUUsSUFBeUM7UUFDdEYsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMzQixVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRXpCLE1BQU0sV0FBVyxHQUFHLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBRWhFLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNsQixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUM7UUFFbEMsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQy9HLHdJQUF3STtRQUV4SSxJQUFJLGdCQUFnQixFQUFFLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNwQyxxQkFBcUI7WUFDckIsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxDQUFDLElBQUksSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUN6RSxNQUFNLGNBQWMsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUVqRSxJQUFJLENBQUM7WUFDSixJQUFJLElBQUksRUFBRSxDQUFDO2dCQUNWLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLEVBQUUsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzNFLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQztZQUMxRCxDQUFDO1FBQ0YsQ0FBQztnQkFBUyxDQUFDO1FBQ1gsQ0FBQztJQUNGLENBQUM7SUFFTyx1QkFBdUI7UUFDOUIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhO1FBQ2xCLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDeEIsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUUzQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQztRQUMxQyxJQUFJLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDekIsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxDQUFDO1FBRW5ELElBQUksV0FBVyxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUNwRCxNQUFNLE1BQU0sR0FBRywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsV0FBVyxDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUM1SCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQzFDLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3BFLENBQUM7WUFDRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQzlELENBQUM7UUFFRCxJQUFJLENBQUM7WUFDSixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3JCLENBQUM7UUFBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVsQixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3JCLENBQUM7SUFFRCxLQUFLLENBQUMsVUFBVTtRQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkIsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDO1FBQzlDLE1BQU0sSUFBSSxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDdkIsSUFBSSxJQUFJLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDZCxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9DLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztJQUM5RCxDQUFDO0lBRUQsS0FBSyxDQUFDLFNBQVM7UUFDZCxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25CLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztRQUM5QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNoRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUVELFFBQVE7UUFDUCxPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksS0FBSyxDQUFDO0lBQzFDLENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO0lBQ3JCLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxLQUFhLEVBQUUsU0FBNEI7UUFDN0QsUUFBUSxTQUFTLEVBQUUsQ0FBQztZQUNuQixLQUFLLE9BQU87Z0JBQ1gsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLGtCQUFrQixLQUFLLEtBQUssRUFBRSxDQUFDO29CQUNoRCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ3JCLENBQUM7Z0JBQ0QsTUFBTTtZQUNQLEtBQUssT0FBTztnQkFDWCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsa0JBQWtCLEtBQUssS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUNwRCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ3JCLENBQUM7Z0JBQ0QsTUFBTTtZQUNQO2dCQUNDLE1BQU07UUFDUixDQUFDO0lBQ0YsQ0FBQztJQUVELGVBQWUsQ0FBQyxFQUFXO1FBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkIsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyx3QkFBc0IsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDO1FBQ3pELElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2YsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxjQUFjLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNoQyw2QkFBNkI7WUFDN0IsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDO1FBQzlELENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkQsSUFBSSxNQUFNLElBQUksR0FBRyxFQUFFLENBQUM7WUFDbkIsa0JBQWtCO1lBQ2xCLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxLQUFhLENBQUM7UUFDbEIsSUFBSSxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDaEIsS0FBSyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztZQUMvQixJQUFJLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzFCLENBQUM7YUFBTSxDQUFDO1lBQ1AsS0FBSyxHQUFHLHdCQUFzQixDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN0RCxJQUFJLENBQUMsY0FBYyxHQUFHLE1BQU0sQ0FBQztRQUM5QixDQUFDO1FBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQzVDLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDM0MsQ0FBQztJQUVELEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxPQUFnQjtRQUMxQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsTUFBTSxFQUFFLENBQUM7SUFDbEMsQ0FBQztJQUVELGNBQWM7UUFDYixPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLENBQUM7SUFDdkMsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsaUJBQWlCLEVBQUUsTUFBTSxFQUFFLENBQUM7UUFDakMsSUFBSSxDQUFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsQ0FBQztRQUM5QixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3BCLENBQUM7SUFFRCxPQUFPLENBQUMsT0FBZ0I7UUFDdkIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUM1QixNQUFNLFdBQVcsR0FBRyxNQUFNLEVBQUUsa0JBQWtCLENBQUM7UUFDL0MsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNyRCxNQUFNLGVBQWUsR0FBRyxZQUFZLENBQUMsS0FBSyxLQUFLLFdBQVcsSUFBSSxZQUFZLENBQUMsR0FBRyxLQUFLLFdBQVcsQ0FBQztRQUUvRixJQUFJLE1BQU0sSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUMvQiwrQ0FBK0M7WUFDL0MsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzVDLE1BQU0sc0JBQXNCLEdBQUcsV0FBVyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQ3ZELE1BQU0sa0JBQWtCLEdBQUcsV0FBVyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNyRixNQUFNLG9CQUFvQixHQUFHLFdBQVcsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBRS9GLElBQUksc0JBQXNCLEVBQUUsQ0FBQztnQkFDNUIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDbEUsQ0FBQztpQkFBTSxJQUFJLGtCQUFrQixFQUFFLENBQUM7Z0JBQy9CLElBQUksQ0FBQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFFLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDdEYsQ0FBQztpQkFBTSxJQUFJLG9CQUFvQixFQUFFLENBQUM7Z0JBQ2pDLElBQUksQ0FBQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQ3BHLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN0QyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNoQyxJQUFJLENBQUMsWUFBWSxFQUFFLE1BQU0sRUFBRSxDQUFDO1FBQzVCLElBQUksQ0FBQyxZQUFZLEdBQUcsU0FBUyxDQUFDO1FBQzlCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDcEIsSUFBSSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQztRQUN4QixJQUFJLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQztRQUN6QixJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDckMsQ0FBQztJQUVELGtFQUFrRTtJQUNsRSxxQkFBcUIsQ0FBQyxJQUFvQjtRQUN6QyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLHdCQUF3QjtZQUN4QixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUNySCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFRCx3QkFBd0I7SUFDeEIsa0JBQWtCLENBQUMsSUFBb0I7UUFDdEMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUN0Qyx3QkFBd0I7WUFDeEIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3JILE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUNlLE9BQU87UUFDdEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNwQixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDakIsQ0FBQzs7QUE1cEJXLHNCQUFzQjtJQWlDaEMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsOEJBQThCLENBQUE7SUFDOUIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLFlBQVksQ0FBQTtHQXhDRixzQkFBc0IsQ0E2cEJsQzs7QUFFRCxNQUFNLE9BQU8sWUFBWTtJQUd4QjtRQUZRLGVBQVUsR0FBVyxDQUFDLENBQUM7SUFHL0IsQ0FBQztJQUVELEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxNQUF5QixFQUFFLEtBQTZCLEVBQUUsSUFBNkI7UUFDbkgsbUNBQW1DO1FBQ25DLElBQUksRUFBRSxJQUFJLENBQUMsVUFBVSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzdCLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUN2QixDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDM0MsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQztZQUM5QyxNQUFNLEtBQUssR0FBRyxTQUFTLEdBQUcsYUFBYSxDQUFDO1lBQ3hDLCtFQUErRTtZQUMvRSxNQUFNLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLG1CQUFtQixFQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN0SCxDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBeUIsRUFBRSxLQUE2QjtRQUN6RSxNQUFNLDBDQUEwQyxHQUF5QixDQUFDLFNBQVMsRUFBRSxFQUFFO1lBQ3RGLElBQUksSUFBSSxHQUFvQixJQUFJLENBQUM7WUFDakMsS0FBSyxNQUFNLElBQUksSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDOUIsSUFBSSxHQUFHLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQ2hHLDBEQUEwRDtZQUMzRCxDQUFDO1lBQ0QsT0FBTyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDaEQsQ0FBQyxDQUFDO1FBRUYsbUNBQW1DO1FBQ25DLElBQUksRUFBRSxJQUFJLENBQUMsVUFBVSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzdCLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUN2QixDQUFDO1FBQ0QsTUFBTSxDQUFDLFlBQVksQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLEVBQUUsMENBQTBDLENBQUMsQ0FBQztJQUM1RixDQUFDO0NBQ0Q7QUFHRCw0QkFBNEIsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsc0JBQXNCLENBQUMsQ0FBQyJ9