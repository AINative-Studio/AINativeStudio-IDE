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
var InlineChatController_1, InlineChatController1_1, InlineChatController2_1;
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { Barrier, DeferredPromise, Queue, raceCancellation } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { DisposableStore, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { MovingAverage } from '../../../../base/common/numbers.js';
import { autorun, autorunWithStore, derived, observableFromEvent, observableSignalFromEvent, observableValue, transaction, waitForState } from '../../../../base/common/observable.js';
import { isEqual } from '../../../../base/common/resources.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { assertType } from '../../../../base/common/types.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { observableCodeEditor } from '../../../../editor/browser/observableCodeEditor.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { Selection } from '../../../../editor/common/core/selection.js';
import { TextEdit } from '../../../../editor/common/languages.js';
import { IEditorWorkerService } from '../../../../editor/common/services/editorWorker.js';
import { DefaultModelSHA1Computer } from '../../../../editor/common/services/modelService.js';
import { InlineCompletionsController } from '../../../../editor/contrib/inlineCompletions/browser/controller/inlineCompletionsController.js';
import { MessageController } from '../../../../editor/contrib/message/browser/messageController.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { showChatView } from '../../chat/browser/chat.js';
import { IChatService } from '../../chat/common/chatService.js';
import { INotebookEditorService } from '../../notebook/browser/services/notebookEditorService.js';
import { CTX_INLINE_CHAT_EDITING, CTX_INLINE_CHAT_HAS_AGENT2, CTX_INLINE_CHAT_REQUEST_IN_PROGRESS, CTX_INLINE_CHAT_RESPONSE_TYPE, CTX_INLINE_CHAT_VISIBLE, INLINE_CHAT_ID } from '../common/inlineChat.js';
import { Session } from './inlineChatSession.js';
import { IInlineChatSessionService } from './inlineChatSessionService.js';
import { InlineChatError } from './inlineChatSessionServiceImpl.js';
import { LiveStrategy } from './inlineChatStrategies.js';
import { InlineChatZoneWidget } from './inlineChatZoneWidget.js';
import { ChatAgentLocation } from '../../chat/common/constants.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { IChatEditingService } from '../../chat/common/chatEditingService.js';
export var State;
(function (State) {
    State["CREATE_SESSION"] = "CREATE_SESSION";
    State["INIT_UI"] = "INIT_UI";
    State["WAIT_FOR_INPUT"] = "WAIT_FOR_INPUT";
    State["SHOW_REQUEST"] = "SHOW_REQUEST";
    State["PAUSE"] = "PAUSE";
    State["CANCEL"] = "CANCEL";
    State["ACCEPT"] = "DONE";
})(State || (State = {}));
var Message;
(function (Message) {
    Message[Message["NONE"] = 0] = "NONE";
    Message[Message["ACCEPT_SESSION"] = 1] = "ACCEPT_SESSION";
    Message[Message["CANCEL_SESSION"] = 2] = "CANCEL_SESSION";
    Message[Message["PAUSE_SESSION"] = 4] = "PAUSE_SESSION";
    Message[Message["CANCEL_REQUEST"] = 8] = "CANCEL_REQUEST";
    Message[Message["CANCEL_INPUT"] = 16] = "CANCEL_INPUT";
    Message[Message["ACCEPT_INPUT"] = 32] = "ACCEPT_INPUT";
})(Message || (Message = {}));
export class InlineChatRunOptions {
    static isInlineChatRunOptions(options) {
        const { initialSelection, initialRange, message, autoSend, position, existingSession } = options;
        if (typeof message !== 'undefined' && typeof message !== 'string'
            || typeof autoSend !== 'undefined' && typeof autoSend !== 'boolean'
            || typeof initialRange !== 'undefined' && !Range.isIRange(initialRange)
            || typeof initialSelection !== 'undefined' && !Selection.isISelection(initialSelection)
            || typeof position !== 'undefined' && !Position.isIPosition(position)
            || typeof existingSession !== 'undefined' && !(existingSession instanceof Session)) {
            return false;
        }
        return true;
    }
}
let InlineChatController = class InlineChatController {
    static { InlineChatController_1 = this; }
    static { this.ID = 'editor.contrib.inlineChatController'; }
    static get(editor) {
        return editor.getContribution(InlineChatController_1.ID);
    }
    constructor(editor, contextKeyService) {
        const inlineChat2 = observableFromEvent(this, Event.filter(contextKeyService.onDidChangeContext, e => e.affectsSome(new Set(CTX_INLINE_CHAT_HAS_AGENT2.keys()))), () => contextKeyService.contextMatchesRules(CTX_INLINE_CHAT_HAS_AGENT2));
        this._delegate = derived(r => {
            if (inlineChat2.read(r)) {
                return InlineChatController2.get(editor);
            }
            else {
                return InlineChatController1.get(editor);
            }
        });
    }
    dispose() {
    }
    get isActive() {
        return this._delegate.get().isActive;
    }
    async run(arg) {
        return this._delegate.get().run(arg);
    }
    focus() {
        return this._delegate.get().focus();
    }
    get widget() {
        return this._delegate.get().widget;
    }
    getWidgetPosition() {
        return this._delegate.get().getWidgetPosition();
    }
    acceptSession() {
        return this._delegate.get().acceptSession();
    }
};
InlineChatController = InlineChatController_1 = __decorate([
    __param(1, IContextKeyService)
], InlineChatController);
export { InlineChatController };
/**
 * @deprecated
 */
let InlineChatController1 = InlineChatController1_1 = class InlineChatController1 {
    static get(editor) {
        return editor.getContribution(INLINE_CHAT_ID);
    }
    get chatWidget() {
        return this._ui.value.widget.chatWidget;
    }
    constructor(_editor, _instaService, _inlineChatSessionService, _editorWorkerService, _logService, _configurationService, _dialogService, contextKeyService, _chatService, _editorService, notebookEditorService) {
        this._editor = _editor;
        this._instaService = _instaService;
        this._inlineChatSessionService = _inlineChatSessionService;
        this._editorWorkerService = _editorWorkerService;
        this._logService = _logService;
        this._configurationService = _configurationService;
        this._dialogService = _dialogService;
        this._chatService = _chatService;
        this._editorService = _editorService;
        this._isDisposed = false;
        this._store = new DisposableStore();
        this._messages = this._store.add(new Emitter());
        this._onDidEnterState = this._store.add(new Emitter());
        this._sessionStore = this._store.add(new DisposableStore());
        this._stashedSession = this._store.add(new MutableDisposable());
        this._ctxVisible = CTX_INLINE_CHAT_VISIBLE.bindTo(contextKeyService);
        this._ctxEditing = CTX_INLINE_CHAT_EDITING.bindTo(contextKeyService);
        this._ctxResponseType = CTX_INLINE_CHAT_RESPONSE_TYPE.bindTo(contextKeyService);
        this._ctxRequestInProgress = CTX_INLINE_CHAT_REQUEST_IN_PROGRESS.bindTo(contextKeyService);
        this._ctxResponse = ChatContextKeys.isResponse.bindTo(contextKeyService);
        ChatContextKeys.responseHasError.bindTo(contextKeyService);
        this._ui = new Lazy(() => {
            const location = {
                location: ChatAgentLocation.Editor,
                resolveData: () => {
                    assertType(this._editor.hasModel());
                    assertType(this._session);
                    return {
                        type: ChatAgentLocation.Editor,
                        selection: this._editor.getSelection(),
                        document: this._session.textModelN.uri,
                        wholeRange: this._session?.wholeRange.trackedInitialRange,
                    };
                }
            };
            // inline chat in notebooks
            // check if this editor is part of a notebook editor
            // and iff so, use the notebook location but keep the resolveData
            // talk about editor data
            for (const notebookEditor of notebookEditorService.listNotebookEditors()) {
                for (const [, codeEditor] of notebookEditor.codeEditors) {
                    if (codeEditor === this._editor) {
                        location.location = ChatAgentLocation.Notebook;
                        break;
                    }
                }
            }
            const zone = _instaService.createInstance(InlineChatZoneWidget, location, undefined, this._editor);
            this._store.add(zone);
            this._store.add(zone.widget.chatWidget.onDidClear(async () => {
                const r = this.joinCurrentRun();
                this.cancelSession();
                await r;
                this.run();
            }));
            return zone;
        });
        this._store.add(this._editor.onDidChangeModel(async (e) => {
            if (this._session || !e.newModelUrl) {
                return;
            }
            const existingSession = this._inlineChatSessionService.getSession(this._editor, e.newModelUrl);
            if (!existingSession) {
                return;
            }
            this._log('session RESUMING after model change', e);
            await this.run({ existingSession });
        }));
        this._store.add(this._inlineChatSessionService.onDidEndSession(e => {
            if (e.session === this._session && e.endedByExternalCause) {
                this._log('session ENDED by external cause');
                this.acceptSession();
            }
        }));
        this._store.add(this._inlineChatSessionService.onDidMoveSession(async (e) => {
            if (e.editor === this._editor) {
                this._log('session RESUMING after move', e);
                await this.run({ existingSession: e.session });
            }
        }));
        this._log(`NEW controller`);
    }
    dispose() {
        if (this._currentRun) {
            this._messages.fire(this._session?.chatModel.hasRequests
                ? 4 /* Message.PAUSE_SESSION */
                : 2 /* Message.CANCEL_SESSION */);
        }
        this._store.dispose();
        this._isDisposed = true;
        this._log('DISPOSED controller');
    }
    _log(message, ...more) {
        if (message instanceof Error) {
            this._logService.error(message, ...more);
        }
        else {
            this._logService.trace(`[IE] (editor:${this._editor.getId()}) ${message}`, ...more);
        }
    }
    get widget() {
        return this._ui.value.widget;
    }
    getId() {
        return INLINE_CHAT_ID;
    }
    getWidgetPosition() {
        return this._ui.value.position;
    }
    async run(options = {}) {
        let lastState;
        const d = this._onDidEnterState.event(e => lastState = e);
        try {
            this.acceptSession();
            if (this._currentRun) {
                await this._currentRun;
            }
            if (options.initialSelection) {
                this._editor.setSelection(options.initialSelection);
            }
            this._stashedSession.clear();
            this._currentRun = this._nextState("CREATE_SESSION" /* State.CREATE_SESSION */, options);
            await this._currentRun;
        }
        catch (error) {
            // this should not happen but when it does make sure to tear down the UI and everything
            this._log('error during run', error);
            onUnexpectedError(error);
            if (this._session) {
                this._inlineChatSessionService.releaseSession(this._session);
            }
            this["PAUSE" /* State.PAUSE */]();
        }
        finally {
            this._currentRun = undefined;
            d.dispose();
        }
        return lastState !== "CANCEL" /* State.CANCEL */;
    }
    // ---- state machine
    async _nextState(state, options) {
        let nextState = state;
        while (nextState && !this._isDisposed) {
            this._log('setState to ', nextState);
            const p = this[nextState](options);
            this._onDidEnterState.fire(nextState);
            nextState = await p;
        }
    }
    async ["CREATE_SESSION" /* State.CREATE_SESSION */](options) {
        assertType(this._session === undefined);
        assertType(this._editor.hasModel());
        let session = options.existingSession;
        let initPosition;
        if (options.position) {
            initPosition = Position.lift(options.position).delta(-1);
            delete options.position;
        }
        const widgetPosition = this._showWidget(session?.headless, true, initPosition);
        // this._updatePlaceholder();
        let errorMessage = localize('create.fail', "Failed to start editor chat");
        if (!session) {
            const createSessionCts = new CancellationTokenSource();
            const msgListener = Event.once(this._messages.event)(m => {
                this._log('state=_createSession) message received', m);
                if (m === 32 /* Message.ACCEPT_INPUT */) {
                    // user accepted the input before having a session
                    options.autoSend = true;
                    this._ui.value.widget.updateInfo(localize('welcome.2', "Getting ready..."));
                }
                else {
                    createSessionCts.cancel();
                }
            });
            try {
                session = await this._inlineChatSessionService.createSession(this._editor, { wholeRange: options.initialRange }, createSessionCts.token);
            }
            catch (error) {
                // Inline chat errors are from the provider and have their error messages shown to the user
                if (error instanceof InlineChatError || error?.name === InlineChatError.code) {
                    errorMessage = error.message;
                }
            }
            createSessionCts.dispose();
            msgListener.dispose();
            if (createSessionCts.token.isCancellationRequested) {
                if (session) {
                    this._inlineChatSessionService.releaseSession(session);
                }
                return "CANCEL" /* State.CANCEL */;
            }
        }
        delete options.initialRange;
        delete options.existingSession;
        if (!session) {
            MessageController.get(this._editor)?.showMessage(errorMessage, widgetPosition);
            this._log('Failed to start editor chat');
            return "CANCEL" /* State.CANCEL */;
        }
        await session.chatModel.waitForInitialization();
        // create a new strategy
        this._strategy = this._instaService.createInstance(LiveStrategy, session, this._editor, this._ui.value, session.headless);
        this._session = session;
        return "INIT_UI" /* State.INIT_UI */;
    }
    async ["INIT_UI" /* State.INIT_UI */](options) {
        assertType(this._session);
        assertType(this._strategy);
        // hide/cancel inline completions when invoking IE
        InlineCompletionsController.get(this._editor)?.reject();
        this._sessionStore.clear();
        const wholeRangeDecoration = this._editor.createDecorationsCollection();
        const handleWholeRangeChange = () => {
            const newDecorations = this._strategy?.getWholeRangeDecoration() ?? [];
            wholeRangeDecoration.set(newDecorations);
            this._ctxEditing.set(!this._session?.wholeRange.trackedInitialRange.isEmpty());
        };
        this._sessionStore.add(toDisposable(() => {
            wholeRangeDecoration.clear();
            this._ctxEditing.reset();
        }));
        this._sessionStore.add(this._session.wholeRange.onDidChange(handleWholeRangeChange));
        handleWholeRangeChange();
        this._ui.value.widget.setChatModel(this._session.chatModel);
        this._updatePlaceholder();
        const isModelEmpty = !this._session.chatModel.hasRequests;
        this._ui.value.widget.updateToolbar(true);
        this._ui.value.widget.toggleStatus(!isModelEmpty);
        this._showWidget(this._session.headless, isModelEmpty);
        this._sessionStore.add(this._editor.onDidChangeModel((e) => {
            const msg = this._session?.chatModel.hasRequests
                ? 4 /* Message.PAUSE_SESSION */
                : 2 /* Message.CANCEL_SESSION */;
            this._log('model changed, pause or cancel session', msg, e);
            this._messages.fire(msg);
        }));
        this._sessionStore.add(this._editor.onDidChangeModelContent(e => {
            if (this._session?.hunkData.ignoreTextModelNChanges || this._ui.value.widget.hasFocus()) {
                return;
            }
            const wholeRange = this._session.wholeRange;
            let shouldFinishSession = false;
            if (this._configurationService.getValue("inlineChat.finishOnType" /* InlineChatConfigKeys.FinishOnType */)) {
                for (const { range } of e.changes) {
                    shouldFinishSession = !Range.areIntersectingOrTouching(range, wholeRange.value);
                }
            }
            this._session.recordExternalEditOccurred(shouldFinishSession);
            if (shouldFinishSession) {
                this._log('text changed outside of whole range, FINISH session');
                this.acceptSession();
            }
        }));
        this._sessionStore.add(this._session.chatModel.onDidChange(async (e) => {
            if (e.kind === 'removeRequest') {
                // TODO@jrieken there is still some work left for when a request "in the middle"
                // is removed. We will undo all changes till that point but not remove those
                // later request
                await this._session.undoChangesUntil(e.requestId);
            }
        }));
        // apply edits from completed requests that haven't been applied yet
        const editState = this._createChatTextEditGroupState();
        let didEdit = false;
        for (const request of this._session.chatModel.getRequests()) {
            if (!request.response || request.response.result?.errorDetails) {
                // done when seeing the first request that is still pending (no response).
                break;
            }
            for (const part of request.response.response.value) {
                if (part.kind !== 'textEditGroup' || !isEqual(part.uri, this._session.textModelN.uri)) {
                    continue;
                }
                if (part.state?.applied) {
                    continue;
                }
                for (const edit of part.edits) {
                    this._makeChanges(edit, undefined, !didEdit);
                    didEdit = true;
                }
                part.state ??= editState;
            }
        }
        if (didEdit) {
            const diff = await this._editorWorkerService.computeDiff(this._session.textModel0.uri, this._session.textModelN.uri, { computeMoves: false, maxComputationTimeMs: Number.MAX_SAFE_INTEGER, ignoreTrimWhitespace: false }, 'advanced');
            this._session.wholeRange.fixup(diff?.changes ?? []);
            await this._session.hunkData.recompute(editState, diff);
            this._updateCtxResponseType();
        }
        options.position = await this._strategy.renderChanges();
        if (this._session.chatModel.requestInProgress) {
            return "SHOW_REQUEST" /* State.SHOW_REQUEST */;
        }
        else {
            return "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */;
        }
    }
    async ["WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */](options) {
        assertType(this._session);
        assertType(this._strategy);
        this._updatePlaceholder();
        if (options.message) {
            this._updateInput(options.message);
            aria.alert(options.message);
            delete options.message;
            this._showWidget(this._session.headless, false);
        }
        let message = 0 /* Message.NONE */;
        let request;
        const barrier = new Barrier();
        const store = new DisposableStore();
        store.add(this._session.chatModel.onDidChange(e => {
            if (e.kind === 'addRequest') {
                request = e.request;
                message = 32 /* Message.ACCEPT_INPUT */;
                barrier.open();
            }
        }));
        store.add(this._strategy.onDidAccept(() => this.acceptSession()));
        store.add(this._strategy.onDidDiscard(() => this.cancelSession()));
        store.add(Event.once(this._messages.event)(m => {
            this._log('state=_waitForInput) message received', m);
            message = m;
            barrier.open();
        }));
        if (options.autoSend) {
            delete options.autoSend;
            this._showWidget(this._session.headless, false);
            this._ui.value.widget.chatWidget.acceptInput();
        }
        await barrier.wait();
        store.dispose();
        if (message & (16 /* Message.CANCEL_INPUT */ | 2 /* Message.CANCEL_SESSION */)) {
            return "CANCEL" /* State.CANCEL */;
        }
        if (message & 4 /* Message.PAUSE_SESSION */) {
            return "PAUSE" /* State.PAUSE */;
        }
        if (message & 1 /* Message.ACCEPT_SESSION */) {
            this._ui.value.widget.selectAll();
            return "DONE" /* State.ACCEPT */;
        }
        if (!request?.message.text) {
            return "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */;
        }
        return "SHOW_REQUEST" /* State.SHOW_REQUEST */;
    }
    async ["SHOW_REQUEST" /* State.SHOW_REQUEST */](options) {
        assertType(this._session);
        assertType(this._strategy);
        assertType(this._session.chatModel.requestInProgress);
        this._ctxRequestInProgress.set(true);
        const { chatModel } = this._session;
        const request = chatModel.lastRequest;
        assertType(request);
        assertType(request.response);
        this._showWidget(this._session.headless, false);
        this._ui.value.widget.selectAll();
        this._ui.value.widget.updateInfo('');
        this._ui.value.widget.toggleStatus(true);
        const { response } = request;
        const responsePromise = new DeferredPromise();
        const store = new DisposableStore();
        const progressiveEditsCts = store.add(new CancellationTokenSource());
        const progressiveEditsAvgDuration = new MovingAverage();
        const progressiveEditsClock = StopWatch.create();
        const progressiveEditsQueue = new Queue();
        // disable typing and squiggles while streaming a reply
        const origDeco = this._editor.getOption(103 /* EditorOption.renderValidationDecorations */);
        this._editor.updateOptions({
            renderValidationDecorations: 'off'
        });
        store.add(toDisposable(() => {
            this._editor.updateOptions({
                renderValidationDecorations: origDeco
            });
        }));
        let next = "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */;
        store.add(Event.once(this._messages.event)(message => {
            this._log('state=_makeRequest) message received', message);
            this._chatService.cancelCurrentRequestForSession(chatModel.sessionId);
            if (message & 2 /* Message.CANCEL_SESSION */) {
                next = "CANCEL" /* State.CANCEL */;
            }
            else if (message & 4 /* Message.PAUSE_SESSION */) {
                next = "PAUSE" /* State.PAUSE */;
            }
            else if (message & 1 /* Message.ACCEPT_SESSION */) {
                next = "DONE" /* State.ACCEPT */;
            }
        }));
        store.add(chatModel.onDidChange(async (e) => {
            if (e.kind === 'removeRequest' && e.requestId === request.id) {
                progressiveEditsCts.cancel();
                responsePromise.complete();
                if (e.reason === 1 /* ChatRequestRemovalReason.Resend */) {
                    next = "SHOW_REQUEST" /* State.SHOW_REQUEST */;
                }
                else {
                    next = "CANCEL" /* State.CANCEL */;
                }
                return;
            }
            if (e.kind === 'move') {
                assertType(this._session);
                const log = (msg, ...args) => this._log('state=_showRequest) moving inline chat', msg, ...args);
                log('move was requested', e.target, e.range);
                // if there's already a tab open for targetUri, show it and move inline chat to that tab
                // otherwise, open the tab to the side
                const initialSelection = Selection.fromRange(Range.lift(e.range), 0 /* SelectionDirection.LTR */);
                const editorPane = await this._editorService.openEditor({ resource: e.target, options: { selection: initialSelection } }, SIDE_GROUP);
                if (!editorPane) {
                    log('opening editor failed');
                    return;
                }
                const newEditor = editorPane.getControl();
                if (!isCodeEditor(newEditor) || !newEditor.hasModel()) {
                    log('new editor is either missing or not a code editor or does not have a model');
                    return;
                }
                if (this._inlineChatSessionService.getSession(newEditor, e.target)) {
                    log('new editor ALREADY has a session');
                    return;
                }
                const newSession = await this._inlineChatSessionService.createSession(newEditor, {
                    session: this._session,
                }, CancellationToken.None); // TODO@ulugbekna: add proper cancellation?
                InlineChatController1_1.get(newEditor)?.run({ existingSession: newSession });
                next = "CANCEL" /* State.CANCEL */;
                responsePromise.complete();
                return;
            }
        }));
        // cancel the request when the user types
        store.add(this._ui.value.widget.chatWidget.inputEditor.onDidChangeModelContent(() => {
            this._chatService.cancelCurrentRequestForSession(chatModel.sessionId);
        }));
        let lastLength = 0;
        let isFirstChange = true;
        const editState = this._createChatTextEditGroupState();
        let localEditGroup;
        // apply edits
        const handleResponse = () => {
            this._updateCtxResponseType();
            if (!localEditGroup) {
                localEditGroup = response.response.value.find(part => part.kind === 'textEditGroup' && isEqual(part.uri, this._session?.textModelN.uri));
            }
            if (localEditGroup) {
                localEditGroup.state ??= editState;
                const edits = localEditGroup.edits;
                const newEdits = edits.slice(lastLength);
                if (newEdits.length > 0) {
                    this._log(`${this._session?.textModelN.uri.toString()} received ${newEdits.length} edits`);
                    // NEW changes
                    lastLength = edits.length;
                    progressiveEditsAvgDuration.update(progressiveEditsClock.elapsed());
                    progressiveEditsClock.reset();
                    progressiveEditsQueue.queue(async () => {
                        const startThen = this._session.wholeRange.value.getStartPosition();
                        // making changes goes into a queue because otherwise the async-progress time will
                        // influence the time it takes to receive the changes and progressive typing will
                        // become infinitely fast
                        for (const edits of newEdits) {
                            await this._makeChanges(edits, {
                                duration: progressiveEditsAvgDuration.value,
                                token: progressiveEditsCts.token
                            }, isFirstChange);
                            isFirstChange = false;
                        }
                        // reshow the widget if the start position changed or shows at the wrong position
                        const startNow = this._session.wholeRange.value.getStartPosition();
                        if (!startNow.equals(startThen) || !this._ui.value.position?.equals(startNow)) {
                            this._showWidget(this._session.headless, false, startNow.delta(-1));
                        }
                    });
                }
            }
            if (response.isCanceled) {
                progressiveEditsCts.cancel();
                responsePromise.complete();
            }
            else if (response.isComplete) {
                responsePromise.complete();
            }
        };
        store.add(response.onDidChange(handleResponse));
        handleResponse();
        // (1) we must wait for the request to finish
        // (2) we must wait for all edits that came in via progress to complete
        await responsePromise.p;
        await progressiveEditsQueue.whenIdle();
        if (response.result?.errorDetails && !response.result.errorDetails.responseIsFiltered) {
            await this._session.undoChangesUntil(response.requestId);
        }
        store.dispose();
        const diff = await this._editorWorkerService.computeDiff(this._session.textModel0.uri, this._session.textModelN.uri, { computeMoves: false, maxComputationTimeMs: Number.MAX_SAFE_INTEGER, ignoreTrimWhitespace: false }, 'advanced');
        this._session.wholeRange.fixup(diff?.changes ?? []);
        await this._session.hunkData.recompute(editState, diff);
        this._ctxRequestInProgress.set(false);
        let newPosition;
        if (response.result?.errorDetails) {
            // error -> no message, errors are shown with the request
        }
        else if (response.response.value.length === 0) {
            // empty -> show message
            const status = localize('empty', "No results, please refine your input and try again");
            this._ui.value.widget.updateStatus(status, { classes: ['warn'] });
        }
        else {
            // real response -> no message
            this._ui.value.widget.updateStatus('');
        }
        const position = await this._strategy.renderChanges();
        if (position) {
            // if the selection doesn't start far off we keep the widget at its current position
            // because it makes reading this nicer
            const selection = this._editor.getSelection();
            if (selection?.containsPosition(position)) {
                if (position.lineNumber - selection.startLineNumber > 8) {
                    newPosition = position;
                }
            }
            else {
                newPosition = position;
            }
        }
        this._showWidget(this._session.headless, false, newPosition);
        return next;
    }
    async ["PAUSE" /* State.PAUSE */]() {
        this._resetWidget();
        this._strategy?.dispose?.();
        this._session = undefined;
    }
    async ["DONE" /* State.ACCEPT */]() {
        assertType(this._session);
        assertType(this._strategy);
        this._sessionStore.clear();
        try {
            await this._strategy.apply();
        }
        catch (err) {
            this._dialogService.error(localize('err.apply', "Failed to apply changes.", toErrorMessage(err)));
            this._log('FAILED to apply changes');
            this._log(err);
        }
        this._resetWidget();
        this._inlineChatSessionService.releaseSession(this._session);
        this._strategy?.dispose();
        this._strategy = undefined;
        this._session = undefined;
    }
    async ["CANCEL" /* State.CANCEL */]() {
        this._resetWidget();
        if (this._session) {
            // assertType(this._session);
            assertType(this._strategy);
            this._sessionStore.clear();
            // only stash sessions that were not unstashed, not "empty", and not interacted with
            const shouldStash = !this._session.isUnstashed && this._session.chatModel.hasRequests && this._session.hunkData.size === this._session.hunkData.pending;
            let undoCancelEdits = [];
            try {
                undoCancelEdits = this._strategy.cancel();
            }
            catch (err) {
                this._dialogService.error(localize('err.discard', "Failed to discard changes.", toErrorMessage(err)));
                this._log('FAILED to discard changes');
                this._log(err);
            }
            this._stashedSession.clear();
            if (shouldStash) {
                this._stashedSession.value = this._inlineChatSessionService.stashSession(this._session, this._editor, undoCancelEdits);
            }
            else {
                this._inlineChatSessionService.releaseSession(this._session);
            }
        }
        this._strategy?.dispose();
        this._strategy = undefined;
        this._session = undefined;
    }
    // ----
    _showWidget(headless = false, initialRender = false, position) {
        assertType(this._editor.hasModel());
        this._ctxVisible.set(true);
        let widgetPosition;
        if (position) {
            // explicit position wins
            widgetPosition = position;
        }
        else if (this._ui.rawValue?.position) {
            // already showing - special case of line 1
            if (this._ui.rawValue?.position.lineNumber === 1) {
                widgetPosition = this._ui.rawValue?.position.delta(-1);
            }
            else {
                widgetPosition = this._ui.rawValue?.position;
            }
        }
        else {
            // default to ABOVE the selection
            widgetPosition = this._editor.getSelection().getStartPosition().delta(-1);
        }
        if (this._session && !position && (this._session.hasChangedText || this._session.chatModel.hasRequests)) {
            widgetPosition = this._session.wholeRange.trackedInitialRange.getStartPosition().delta(-1);
        }
        if (initialRender && (this._editor.getOption(120 /* EditorOption.stickyScroll */)).enabled) {
            this._editor.revealLine(widgetPosition.lineNumber); // do NOT substract `this._editor.getOption(EditorOption.stickyScroll).maxLineCount` because the editor already does that
        }
        if (!headless) {
            if (this._ui.rawValue?.position) {
                this._ui.value.updatePositionAndHeight(widgetPosition);
            }
            else {
                this._ui.value.show(widgetPosition);
            }
        }
        return widgetPosition;
    }
    _resetWidget() {
        this._sessionStore.clear();
        this._ctxVisible.reset();
        this._ui.rawValue?.hide();
        // Return focus to the editor only if the current focus is within the editor widget
        if (this._editor.hasWidgetFocus()) {
            this._editor.focus();
        }
    }
    _updateCtxResponseType() {
        if (!this._session) {
            this._ctxResponseType.set("none" /* InlineChatResponseType.None */);
            return;
        }
        const hasLocalEdit = (response) => {
            return response.value.some(part => part.kind === 'textEditGroup' && isEqual(part.uri, this._session?.textModelN.uri));
        };
        let responseType = "none" /* InlineChatResponseType.None */;
        for (const request of this._session.chatModel.getRequests()) {
            if (!request.response) {
                continue;
            }
            responseType = "messages" /* InlineChatResponseType.Messages */;
            if (hasLocalEdit(request.response.response)) {
                responseType = "messagesAndEdits" /* InlineChatResponseType.MessagesAndEdits */;
                break; // no need to check further
            }
        }
        this._ctxResponseType.set(responseType);
        this._ctxResponse.set(responseType !== "none" /* InlineChatResponseType.None */);
    }
    _createChatTextEditGroupState() {
        assertType(this._session);
        const sha1 = new DefaultModelSHA1Computer();
        const textModel0Sha1 = sha1.canComputeSHA1(this._session.textModel0)
            ? sha1.computeSHA1(this._session.textModel0)
            : generateUuid();
        return {
            sha1: textModel0Sha1,
            applied: 0
        };
    }
    async _makeChanges(edits, opts, undoStopBefore) {
        assertType(this._session);
        assertType(this._strategy);
        const moreMinimalEdits = await this._editorWorkerService.computeMoreMinimalEdits(this._session.textModelN.uri, edits);
        this._log('edits from PROVIDER and after making them MORE MINIMAL', this._session.agent.extensionId, edits, moreMinimalEdits);
        if (moreMinimalEdits?.length === 0) {
            // nothing left to do
            return;
        }
        const actualEdits = !opts && moreMinimalEdits ? moreMinimalEdits : edits;
        const editOperations = actualEdits.map(TextEdit.asEditOperation);
        const editsObserver = {
            start: () => this._session.hunkData.ignoreTextModelNChanges = true,
            stop: () => this._session.hunkData.ignoreTextModelNChanges = false,
        };
        if (opts) {
            await this._strategy.makeProgressiveChanges(editOperations, editsObserver, opts, undoStopBefore);
        }
        else {
            await this._strategy.makeChanges(editOperations, editsObserver, undoStopBefore);
        }
    }
    _updatePlaceholder() {
        this._ui.value.widget.placeholder = this._session?.agent.description ?? '';
    }
    _updateInput(text, selectAll = true) {
        this._ui.value.widget.chatWidget.setInput(text);
        if (selectAll) {
            const newSelection = new Selection(1, 1, Number.MAX_SAFE_INTEGER, 1);
            this._ui.value.widget.chatWidget.inputEditor.setSelection(newSelection);
        }
    }
    // ---- controller API
    arrowOut(up) {
        if (this._ui.value.position && this._editor.hasModel()) {
            const { column } = this._editor.getPosition();
            const { lineNumber } = this._ui.value.position;
            const newLine = up ? lineNumber : lineNumber + 1;
            this._editor.setPosition({ lineNumber: newLine, column });
            this._editor.focus();
        }
    }
    focus() {
        this._ui.value.widget.focus();
    }
    async viewInChat() {
        if (!this._strategy || !this._session) {
            return;
        }
        let someApplied = false;
        let lastEdit;
        const uri = this._editor.getModel()?.uri;
        const requests = this._session.chatModel.getRequests();
        for (const request of requests) {
            if (!request.response) {
                continue;
            }
            for (const part of request.response.response.value) {
                if (part.kind === 'textEditGroup' && isEqual(part.uri, uri)) {
                    // fully or partially applied edits
                    someApplied = someApplied || Boolean(part.state?.applied);
                    lastEdit = part;
                }
            }
        }
        const doEdits = this._strategy.cancel();
        if (someApplied) {
            assertType(lastEdit);
            lastEdit.edits = [doEdits];
            lastEdit.state.applied = 0;
        }
        await this._instaService.invokeFunction(moveToPanelChat, this._session?.chatModel);
        this.cancelSession();
    }
    acceptSession() {
        const response = this._session?.chatModel.getRequests().at(-1)?.response;
        if (response) {
            this._chatService.notifyUserAction({
                sessionId: response.session.sessionId,
                requestId: response.requestId,
                agentId: response.agent?.id,
                command: response.slashCommand?.name,
                result: response.result,
                action: {
                    kind: 'inlineChat',
                    action: 'accepted'
                }
            });
        }
        this._messages.fire(1 /* Message.ACCEPT_SESSION */);
    }
    acceptHunk(hunkInfo) {
        return this._strategy?.performHunkAction(hunkInfo, 0 /* HunkAction.Accept */);
    }
    discardHunk(hunkInfo) {
        return this._strategy?.performHunkAction(hunkInfo, 1 /* HunkAction.Discard */);
    }
    toggleDiff(hunkInfo) {
        return this._strategy?.performHunkAction(hunkInfo, 4 /* HunkAction.ToggleDiff */);
    }
    moveHunk(next) {
        this.focus();
        this._strategy?.performHunkAction(undefined, next ? 2 /* HunkAction.MoveNext */ : 3 /* HunkAction.MovePrev */);
    }
    async cancelSession() {
        const response = this._session?.chatModel.lastRequest?.response;
        if (response) {
            this._chatService.notifyUserAction({
                sessionId: response.session.sessionId,
                requestId: response.requestId,
                agentId: response.agent?.id,
                command: response.slashCommand?.name,
                result: response.result,
                action: {
                    kind: 'inlineChat',
                    action: 'discarded'
                }
            });
        }
        this._messages.fire(2 /* Message.CANCEL_SESSION */);
    }
    reportIssue() {
        const response = this._session?.chatModel.lastRequest?.response;
        if (response) {
            this._chatService.notifyUserAction({
                sessionId: response.session.sessionId,
                requestId: response.requestId,
                agentId: response.agent?.id,
                command: response.slashCommand?.name,
                result: response.result,
                action: { kind: 'bug' }
            });
        }
    }
    unstashLastSession() {
        const result = this._stashedSession.value?.unstash();
        return result;
    }
    joinCurrentRun() {
        return this._currentRun;
    }
    get isActive() {
        return Boolean(this._currentRun);
    }
};
InlineChatController1 = InlineChatController1_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IInlineChatSessionService),
    __param(3, IEditorWorkerService),
    __param(4, ILogService),
    __param(5, IConfigurationService),
    __param(6, IDialogService),
    __param(7, IContextKeyService),
    __param(8, IChatService),
    __param(9, IEditorService),
    __param(10, INotebookEditorService)
], InlineChatController1);
export { InlineChatController1 };
let InlineChatController2 = class InlineChatController2 {
    static { InlineChatController2_1 = this; }
    static { this.ID = 'editor.contrib.inlineChatController2'; }
    static get(editor) {
        return editor.getContribution(InlineChatController2_1.ID) ?? undefined;
    }
    get widget() {
        return this._zone.value.widget;
    }
    get isActive() {
        return Boolean(this._currentSession.get());
    }
    constructor(_editor, _instaService, _notebookEditorService, _inlineChatSessions, codeEditorService, contextKeyService) {
        this._editor = _editor;
        this._instaService = _instaService;
        this._notebookEditorService = _notebookEditorService;
        this._inlineChatSessions = _inlineChatSessions;
        this._store = new DisposableStore();
        this._showWidgetOverrideObs = observableValue(this, false);
        this._isActiveController = observableValue(this, false);
        const ctxInlineChatVisible = CTX_INLINE_CHAT_VISIBLE.bindTo(contextKeyService);
        this._zone = new Lazy(() => {
            const location = {
                location: ChatAgentLocation.Editor,
                resolveData: () => {
                    assertType(this._editor.hasModel());
                    return {
                        type: ChatAgentLocation.Editor,
                        selection: this._editor.getSelection(),
                        document: this._editor.getModel().uri,
                        wholeRange: this._editor.getSelection(),
                    };
                }
            };
            // inline chat in notebooks
            // check if this editor is part of a notebook editor
            // and iff so, use the notebook location but keep the resolveData
            // talk about editor data
            for (const notebookEditor of this._notebookEditorService.listNotebookEditors()) {
                for (const [, codeEditor] of notebookEditor.codeEditors) {
                    if (codeEditor === this._editor) {
                        location.location = ChatAgentLocation.Notebook;
                        break;
                    }
                }
            }
            const result = this._instaService.createInstance(InlineChatZoneWidget, location, {
                enableWorkingSet: 'implicit',
                rendererOptions: {
                    renderTextEditsAsSummary: _uri => true
                }
            }, this._editor);
            result.domNode.classList.add('inline-chat-2');
            return result;
        });
        const editorObs = observableCodeEditor(_editor);
        const sessionsSignal = observableSignalFromEvent(this, _inlineChatSessions.onDidChangeSessions);
        this._currentSession = derived(r => {
            sessionsSignal.read(r);
            const model = editorObs.model.read(r);
            const value = model && _inlineChatSessions.getSession2(model.uri);
            return value ?? undefined;
        });
        this._store.add(autorun(r => {
            const session = this._currentSession.read(r);
            if (!session) {
                this._isActiveController.set(false, undefined);
                return;
            }
            let foundOne = false;
            for (const editor of codeEditorService.listCodeEditors()) {
                if (Boolean(InlineChatController2_1.get(editor)?._isActiveController.get())) {
                    foundOne = true;
                    break;
                }
            }
            if (!foundOne && _editor.hasWidgetFocus()) {
                this._isActiveController.set(true, undefined);
            }
        }));
        const visibleSessionObs = observableValue(this, undefined);
        this._store.add(autorunWithStore((r, store) => {
            const model = editorObs.model.read(r);
            const session = this._currentSession.read(r);
            const isActive = this._isActiveController.read(r);
            if (!session || !isActive || !model) {
                visibleSessionObs.set(undefined, undefined);
                return;
            }
            const { chatModel } = session;
            const showShowUntil = this._showWidgetOverrideObs.read(r);
            const hasNoRequests = chatModel.getRequests().length === 0;
            const responseListener = store.add(new MutableDisposable());
            store.add(chatModel.onDidChange(e => {
                if (e.kind === 'addRequest') {
                    transaction(tx => {
                        this._showWidgetOverrideObs.set(false, tx);
                        visibleSessionObs.set(undefined, tx);
                    });
                    const { response } = e.request;
                    if (!response) {
                        return;
                    }
                    responseListener.value = response.onDidChange(async (e) => {
                        if (!response.isComplete) {
                            return;
                        }
                        const shouldShow = response.isCanceled // cancelled
                            || response.result?.errorDetails // errors
                            || !response.response.value.find(part => part.kind === 'textEditGroup'
                                && part.edits.length > 0
                                && isEqual(part.uri, model.uri)); // NO edits for file
                        if (shouldShow) {
                            visibleSessionObs.set(session, undefined);
                        }
                    });
                }
            }));
            if (showShowUntil || hasNoRequests) {
                visibleSessionObs.set(session, undefined);
            }
            else {
                visibleSessionObs.set(undefined, undefined);
            }
        }));
        this._store.add(autorun(r => {
            const session = visibleSessionObs.read(r);
            if (!session) {
                this._zone.rawValue?.hide();
                _editor.focus();
                ctxInlineChatVisible.reset();
            }
            else {
                ctxInlineChatVisible.set(true);
                this._zone.value.widget.setChatModel(session.chatModel);
                if (!this._zone.value.position) {
                    this._zone.value.show(session.initialPosition);
                }
                this._zone.value.reveal(this._zone.value.position);
                this._zone.value.widget.focus();
                session.editingSession.getEntry(session.uri)?.autoAcceptController.get()?.cancel();
            }
        }));
    }
    dispose() {
        this._store.dispose();
    }
    toggleWidgetUntilNextRequest() {
        const value = this._showWidgetOverrideObs.get();
        this._showWidgetOverrideObs.set(!value, undefined);
    }
    getWidgetPosition() {
        return this._zone.rawValue?.position;
    }
    focus() {
        this._zone.rawValue?.widget.focus();
    }
    markActiveController() {
        this._isActiveController.set(true, undefined);
    }
    async run(arg) {
        assertType(this._editor.hasModel());
        this.markActiveController();
        const uri = this._editor.getModel().uri;
        const session = this._inlineChatSessions.getSession2(uri)
            ?? await this._inlineChatSessions.createSession2(this._editor, uri, CancellationToken.None);
        if (arg && InlineChatRunOptions.isInlineChatRunOptions(arg)) {
            if (arg.initialRange) {
                this._editor.revealRange(arg.initialRange);
            }
            if (arg.initialSelection) {
                this._editor.setSelection(arg.initialSelection);
            }
            if (arg.message) {
                this._zone.value.widget.chatWidget.setInput(arg.message);
                if (arg.autoSend) {
                    await this._zone.value.widget.chatWidget.acceptInput();
                }
            }
        }
        await Event.toPromise(session.editingSession.onDidDispose);
        const rejected = session.editingSession.getEntry(uri)?.state.get() === 2 /* WorkingSetEntryState.Rejected */;
        return !rejected;
    }
    acceptSession() {
        const value = this._currentSession.get();
        value?.editingSession.accept();
    }
};
InlineChatController2 = InlineChatController2_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, INotebookEditorService),
    __param(3, IInlineChatSessionService),
    __param(4, ICodeEditorService),
    __param(5, IContextKeyService)
], InlineChatController2);
export { InlineChatController2 };
export async function reviewEdits(accessor, editor, stream, token) {
    if (!editor.hasModel()) {
        return false;
    }
    const chatService = accessor.get(IChatService);
    const chatEditingService = accessor.get(IChatEditingService);
    const uri = editor.getModel().uri;
    const chatModel = chatService.startSession(ChatAgentLocation.Editor, token, false);
    const editSession = await chatEditingService.createEditingSession(chatModel);
    const store = new DisposableStore();
    store.add(chatModel);
    store.add(editSession);
    // STREAM
    const chatRequest = chatModel?.addRequest({ text: '', parts: [] }, { variables: [] }, 0);
    assertType(chatRequest.response);
    chatRequest.response.updateContent({ kind: 'textEdit', uri, edits: [], done: false });
    for await (const chunk of stream) {
        if (token.isCancellationRequested) {
            chatRequest.response.cancel();
            break;
        }
        chatRequest.response.updateContent({ kind: 'textEdit', uri, edits: chunk, done: false });
    }
    chatRequest.response.updateContent({ kind: 'textEdit', uri, edits: [], done: true });
    if (!token.isCancellationRequested) {
        chatRequest.response.complete();
    }
    const isSettled = derived(r => {
        const entry = editSession.readEntry(uri, r);
        if (!entry) {
            return false;
        }
        const state = entry.state.read(r);
        return state === 1 /* WorkingSetEntryState.Accepted */ || state === 2 /* WorkingSetEntryState.Rejected */;
    });
    const whenDecided = waitForState(isSettled, Boolean);
    await raceCancellation(whenDecided, token);
    store.dispose();
    return true;
}
async function moveToPanelChat(accessor, model) {
    const viewsService = accessor.get(IViewsService);
    const chatService = accessor.get(IChatService);
    const widget = await showChatView(viewsService);
    if (widget && widget.viewModel && model) {
        for (const request of model.getRequests().slice()) {
            await chatService.adoptRequest(widget.viewModel.model.sessionId, request);
        }
        widget.focusLastMessage();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdENvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaW5saW5lQ2hhdC9icm93c2VyL2lubGluZUNoYXRDb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssSUFBSSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE9BQU8sRUFBZSxtQkFBbUIsRUFBRSx5QkFBeUIsRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3BNLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsU0FBUyxFQUFF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