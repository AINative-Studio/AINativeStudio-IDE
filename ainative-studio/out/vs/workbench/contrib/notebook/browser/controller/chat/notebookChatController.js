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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDaGF0Q29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyb2xsZXIvY2hhdC9ub3RlYm9va0NoYXRDb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFpQixtQkFBbUIsRUFBRSxTQUFTLEVBQUUsNEJBQTRCLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDM0osT0FBTyxFQUFxQixlQUFlLEVBQUUsS0FBSyxFQUFFLHVCQUF1QixFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDL0ksT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzNHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDckUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7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