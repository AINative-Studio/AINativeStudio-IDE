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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdENvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbmxpbmVDaGF0L2Jyb3dzZXIvaW5saW5lQ2hhdENvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxJQUFJLE1BQU0sMENBQTBDLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDckcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDeEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFlLG1CQUFtQixFQUFFLHlCQUF5QixFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDcE0sT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQy9ELE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN4RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUU5RixPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDakYsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3hFLE9BQU8sRUFBYyxTQUFTLEVBQXNCLE1BQU0sNkNBQTZDLENBQUM7QUFFeEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGdHQUFnRyxDQUFDO0FBQzdJLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEYsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLDREQUE0RCxDQUFDO0FBQ3JILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsY0FBYyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFHMUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSwwQkFBMEIsRUFBRSxtQ0FBbUMsRUFBRSw2QkFBNkIsRUFBRSx1QkFBdUIsRUFBRSxjQUFjLEVBQWdELE1BQU0seUJBQXlCLENBQUM7QUFDelAsT0FBTyxFQUFtQixPQUFPLEVBQWtCLE1BQU0sd0JBQXdCLENBQUM7QUFDbEYsT0FBTyxFQUF1Qix5QkFBeUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRSxPQUFPLEVBQTZCLFlBQVksRUFBMkIsTUFBTSwyQkFBMkIsQ0FBQztBQUU3RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLG1CQUFtQixFQUF3QixNQUFNLHlDQUF5QyxDQUFDO0FBRXBHLE1BQU0sQ0FBTixJQUFrQixLQVFqQjtBQVJELFdBQWtCLEtBQUs7SUFDdEIsMENBQWlDLENBQUE7SUFDakMsNEJBQW1CLENBQUE7SUFDbkIsMENBQWlDLENBQUE7SUFDakMsc0NBQTZCLENBQUE7SUFDN0Isd0JBQWUsQ0FBQTtJQUNmLDBCQUFpQixDQUFBO0lBQ2pCLHdCQUFlLENBQUE7QUFDaEIsQ0FBQyxFQVJpQixLQUFLLEtBQUwsS0FBSyxRQVF0QjtBQUVELElBQVcsT0FRVjtBQVJELFdBQVcsT0FBTztJQUNqQixxQ0FBUSxDQUFBO0lBQ1IseURBQXVCLENBQUE7SUFDdkIseURBQXVCLENBQUE7SUFDdkIsdURBQXNCLENBQUE7SUFDdEIseURBQXVCLENBQUE7SUFDdkIsc0RBQXFCLENBQUE7SUFDckIsc0RBQXFCLENBQUE7QUFDdEIsQ0FBQyxFQVJVLE9BQU8sS0FBUCxPQUFPLFFBUWpCO0FBRUQsTUFBTSxPQUFnQixvQkFBb0I7SUFRekMsTUFBTSxDQUFDLHNCQUFzQixDQUFDLE9BQVk7UUFDekMsTUFBTSxFQUFFLGdCQUFnQixFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsR0FBeUIsT0FBTyxDQUFDO1FBQ3ZILElBQ0MsT0FBTyxPQUFPLEtBQUssV0FBVyxJQUFJLE9BQU8sT0FBTyxLQUFLLFFBQVE7ZUFDMUQsT0FBTyxRQUFRLEtBQUssV0FBVyxJQUFJLE9BQU8sUUFBUSxLQUFLLFNBQVM7ZUFDaEUsT0FBTyxZQUFZLEtBQUssV0FBVyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUM7ZUFDcEUsT0FBTyxnQkFBZ0IsS0FBSyxXQUFXLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDO2VBQ3BGLE9BQU8sUUFBUSxLQUFLLFdBQVcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDO2VBQ2xFLE9BQU8sZUFBZSxLQUFLLFdBQVcsSUFBSSxDQUFDLENBQUMsZUFBZSxZQUFZLE9BQU8sQ0FBQyxFQUNqRixDQUFDO1lBQ0YsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0NBQ0Q7QUFFTSxJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFvQjs7YUFFekIsT0FBRSxHQUFHLHFDQUFxQyxBQUF4QyxDQUF5QztJQUVsRCxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQW1CO1FBQzdCLE9BQU8sTUFBTSxDQUFDLGVBQWUsQ0FBdUIsc0JBQW9CLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDOUUsQ0FBQztJQUlELFlBQ0MsTUFBbUIsRUFDQyxpQkFBcUM7UUFHekQsTUFBTSxXQUFXLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksR0FBRyxDQUFDLDBCQUEwQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLGlCQUFpQixDQUFDLG1CQUFtQixDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQztRQUUzTyxJQUFJLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUM1QixJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDekIsT0FBTyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFFLENBQUM7WUFDM0MsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8scUJBQXFCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBRSxDQUFDO1lBQzNDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxPQUFPO0lBRVAsQ0FBQztJQUVELElBQUksUUFBUTtRQUNYLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUM7SUFDdEMsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBMEI7UUFDbkMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRUQsSUFBSSxNQUFNO1FBQ1QsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQztJQUNwQyxDQUFDO0lBRUQsaUJBQWlCO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQ2pELENBQUM7SUFFRCxhQUFhO1FBQ1osT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQzdDLENBQUM7O0FBcERXLG9CQUFvQjtJQVk5QixXQUFBLGtCQUFrQixDQUFBO0dBWlIsb0JBQW9CLENBcURoQzs7QUFFRDs7R0FFRztBQUNJLElBQU0scUJBQXFCLDZCQUEzQixNQUFNLHFCQUFxQjtJQUVqQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQW1CO1FBQzdCLE9BQU8sTUFBTSxDQUFDLGVBQWUsQ0FBd0IsY0FBYyxDQUFDLENBQUM7SUFDdEUsQ0FBQztJQWlCRCxJQUFJLFVBQVU7UUFDYixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7SUFDekMsQ0FBQztJQU9ELFlBQ2tCLE9BQW9CLEVBQ2QsYUFBcUQsRUFDakQseUJBQXFFLEVBQzFFLG9CQUEyRCxFQUNwRSxXQUF5QyxFQUMvQixxQkFBNkQsRUFDcEUsY0FBK0MsRUFDM0MsaUJBQXFDLEVBQzNDLFlBQTJDLEVBQ3pDLGNBQStDLEVBQ3ZDLHFCQUE2QztRQVZwRCxZQUFPLEdBQVAsT0FBTyxDQUFhO1FBQ0csa0JBQWEsR0FBYixhQUFhLENBQXVCO1FBQ2hDLDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBMkI7UUFDekQseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFzQjtRQUNuRCxnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUNkLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDbkQsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBRWhDLGlCQUFZLEdBQVosWUFBWSxDQUFjO1FBQ3hCLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtRQWxDeEQsZ0JBQVcsR0FBWSxLQUFLLENBQUM7UUFDcEIsV0FBTSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFXL0IsY0FBUyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksT0FBTyxFQUFXLENBQUMsQ0FBQztRQUNsRCxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLE9BQU8sRUFBUyxDQUFDLENBQUM7UUFNM0Qsa0JBQWEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFDdkQsb0JBQWUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLGlCQUFpQixFQUFrQixDQUFDLENBQUM7UUFpQjNGLElBQUksQ0FBQyxXQUFXLEdBQUcsdUJBQXVCLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDckUsSUFBSSxDQUFDLFdBQVcsR0FBRyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsNkJBQTZCLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDaEYsSUFBSSxDQUFDLHFCQUFxQixHQUFHLG1DQUFtQyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBRTNGLElBQUksQ0FBQyxZQUFZLEdBQUcsZUFBZSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUN6RSxlQUFlLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFFM0QsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFFeEIsTUFBTSxRQUFRLEdBQStCO2dCQUM1QyxRQUFRLEVBQUUsaUJBQWlCLENBQUMsTUFBTTtnQkFDbEMsV0FBVyxFQUFFLEdBQUcsRUFBRTtvQkFDakIsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztvQkFDcEMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDMUIsT0FBTzt3QkFDTixJQUFJLEVBQUUsaUJBQWlCLENBQUMsTUFBTTt3QkFDOUIsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFO3dCQUN0QyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRzt3QkFDdEMsVUFBVSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLG1CQUFtQjtxQkFDekQsQ0FBQztnQkFDSCxDQUFDO2FBQ0QsQ0FBQztZQUVGLDJCQUEyQjtZQUMzQixvREFBb0Q7WUFDcEQsaUVBQWlFO1lBQ2pFLHlCQUF5QjtZQUN6QixLQUFLLE1BQU0sY0FBYyxJQUFJLHFCQUFxQixDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQztnQkFDMUUsS0FBSyxNQUFNLENBQUMsRUFBRSxVQUFVLENBQUMsSUFBSSxjQUFjLENBQUMsV0FBVyxFQUFFLENBQUM7b0JBQ3pELElBQUksVUFBVSxLQUFLLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzt3QkFDakMsUUFBUSxDQUFDLFFBQVEsR0FBRyxpQkFBaUIsQ0FBQyxRQUFRLENBQUM7d0JBQy9DLE1BQU07b0JBQ1AsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUVELE1BQU0sSUFBSSxHQUFHLGFBQWEsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbkcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEtBQUssSUFBSSxFQUFFO2dCQUM1RCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQ2hDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDckIsTUFBTSxDQUFDLENBQUM7Z0JBQ1IsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVKLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBQyxDQUFDLEVBQUMsRUFBRTtZQUN2RCxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3JDLE9BQU87WUFDUixDQUFDO1lBRUQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUMvRixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ3RCLE9BQU87WUFDUixDQUFDO1lBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNwRCxNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFDO1FBQ3JDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2xFLElBQUksQ0FBQyxDQUFDLE9BQU8sS0FBSyxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO2dCQUMzRCxJQUFJLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLENBQUM7Z0JBQzdDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN0QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLEVBQUU7WUFDekUsSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDL0IsSUFBSSxDQUFDLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDNUMsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsZUFBZSxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQ2hELENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsV0FBVztnQkFDdkQsQ0FBQztnQkFDRCxDQUFDLCtCQUF1QixDQUFDLENBQUM7UUFDNUIsQ0FBQztRQUNELElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDeEIsSUFBSSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFTyxJQUFJLENBQUMsT0FBdUIsRUFBRSxHQUFHLElBQVc7UUFDbkQsSUFBSSxPQUFPLFlBQVksS0FBSyxFQUFFLENBQUM7WUFDOUIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDMUMsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsS0FBSyxPQUFPLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQ3JGLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxNQUFNO1FBQ1QsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7SUFDOUIsQ0FBQztJQUVELEtBQUs7UUFDSixPQUFPLGNBQWMsQ0FBQztJQUN2QixDQUFDO0lBRUQsaUJBQWlCO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDO0lBQ2hDLENBQUM7SUFJRCxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQTRDLEVBQUU7UUFFdkQsSUFBSSxTQUE0QixDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFFMUQsSUFBSSxDQUFDO1lBQ0osSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3JCLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUN0QixNQUFNLElBQUksQ0FBQyxXQUFXLENBQUM7WUFDeEIsQ0FBQztZQUNELElBQUksT0FBTyxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQzlCLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ3JELENBQUM7WUFDRCxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFVBQVUsOENBQXVCLE9BQU8sQ0FBQyxDQUFDO1lBQ2xFLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQztRQUV4QixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQix1RkFBdUY7WUFDdkYsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNyQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN6QixJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDbkIsSUFBSSxDQUFDLHlCQUF5QixDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDOUQsQ0FBQztZQUNELElBQUksMkJBQWEsRUFBRSxDQUFDO1FBRXJCLENBQUM7Z0JBQVMsQ0FBQztZQUNWLElBQUksQ0FBQyxXQUFXLEdBQUcsU0FBUyxDQUFDO1lBQzdCLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNiLENBQUM7UUFFRCxPQUFPLFNBQVMsZ0NBQWlCLENBQUM7SUFDbkMsQ0FBQztJQUVELHFCQUFxQjtJQUVYLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBWSxFQUFFLE9BQTZCO1FBQ3JFLElBQUksU0FBUyxHQUFpQixLQUFLLENBQUM7UUFDcEMsT0FBTyxTQUFTLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDckMsTUFBTSxDQUFDLEdBQTJDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMzRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3RDLFNBQVMsR0FBRyxNQUFNLENBQUMsQ0FBQztRQUNyQixDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyw2Q0FBc0IsQ0FBQyxPQUE2QjtRQUNqRSxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsS0FBSyxTQUFTLENBQUMsQ0FBQztRQUN4QyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBRXBDLElBQUksT0FBTyxHQUF3QixPQUFPLENBQUMsZUFBZSxDQUFDO1FBRTNELElBQUksWUFBa0MsQ0FBQztRQUN2QyxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUN0QixZQUFZLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDekQsT0FBTyxPQUFPLENBQUMsUUFBUSxDQUFDO1FBQ3pCLENBQUM7UUFFRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBRS9FLDZCQUE2QjtRQUM3QixJQUFJLFlBQVksR0FBRyxRQUFRLENBQUMsYUFBYSxFQUFFLDZCQUE2QixDQUFDLENBQUM7UUFFMUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUM7WUFDdkQsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUN4RCxJQUFJLENBQUMsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUN2RCxJQUFJLENBQUMsa0NBQXlCLEVBQUUsQ0FBQztvQkFDaEMsa0RBQWtEO29CQUNsRCxPQUFPLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztvQkFDeEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLGtCQUFrQixDQUFDLENBQUMsQ0FBQztnQkFDN0UsQ0FBQztxQkFBTSxDQUFDO29CQUNQLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUMzQixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUM7WUFFSCxJQUFJLENBQUM7Z0JBQ0osT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLHlCQUF5QixDQUFDLGFBQWEsQ0FDM0QsSUFBSSxDQUFDLE9BQU8sRUFDWixFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUMsWUFBWSxFQUFFLEVBQ3BDLGdCQUFnQixDQUFDLEtBQUssQ0FDdEIsQ0FBQztZQUNILENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNoQiwyRkFBMkY7Z0JBQzNGLElBQUksS0FBSyxZQUFZLGVBQWUsSUFBSSxLQUFLLEVBQUUsSUFBSSxLQUFLLGVBQWUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDOUUsWUFBWSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUM7Z0JBQzlCLENBQUM7WUFDRixDQUFDO1lBRUQsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDM0IsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBRXRCLElBQUksZ0JBQWdCLENBQUMsS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7Z0JBQ3BELElBQUksT0FBTyxFQUFFLENBQUM7b0JBQ2IsSUFBSSxDQUFDLHlCQUF5QixDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDeEQsQ0FBQztnQkFDRCxtQ0FBb0I7WUFDckIsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLE9BQU8sQ0FBQyxZQUFZLENBQUM7UUFDNUIsT0FBTyxPQUFPLENBQUMsZUFBZSxDQUFDO1FBRS9CLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsV0FBVyxDQUFDLFlBQVksRUFBRSxjQUFjLENBQUMsQ0FBQztZQUMvRSxJQUFJLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUM7WUFDekMsbUNBQW9CO1FBQ3JCLENBQUM7UUFFRCxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUVoRCx3QkFBd0I7UUFDeEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTFILElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDO1FBQ3hCLHFDQUFxQjtJQUN0QixDQUFDO0lBRU8sS0FBSyxDQUFDLCtCQUFlLENBQUMsT0FBNkI7UUFDMUQsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMxQixVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRTNCLGtEQUFrRDtRQUNsRCwyQkFBMkIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDO1FBRXhELElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFM0IsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLDJCQUEyQixFQUFFLENBQUM7UUFDeEUsTUFBTSxzQkFBc0IsR0FBRyxHQUFHLEVBQUU7WUFDbkMsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSx1QkFBdUIsRUFBRSxJQUFJLEVBQUUsQ0FBQztZQUN2RSxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7WUFFekMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQ2hGLENBQUMsQ0FBQztRQUNGLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDeEMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQztRQUNyRixzQkFBc0IsRUFBRSxDQUFDO1FBRXpCLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM1RCxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUUxQixNQUFNLFlBQVksR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQztRQUMxRCxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNsRCxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBRXZELElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUMxRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxXQUFXO2dCQUMvQyxDQUFDO2dCQUNELENBQUMsK0JBQXVCLENBQUM7WUFDMUIsSUFBSSxDQUFDLElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDNUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUdKLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFHL0QsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyx1QkFBdUIsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztnQkFDekYsT0FBTztZQUNSLENBQUM7WUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsUUFBUyxDQUFDLFVBQVUsQ0FBQztZQUM3QyxJQUFJLG1CQUFtQixHQUFHLEtBQUssQ0FBQztZQUNoQyxJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLG1FQUE0QyxFQUFFLENBQUM7Z0JBQ3JGLEtBQUssTUFBTSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDbkMsbUJBQW1CLEdBQUcsQ0FBQyxLQUFLLENBQUMseUJBQXlCLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDakYsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLENBQUMsUUFBUyxDQUFDLDBCQUEwQixDQUFDLG1CQUFtQixDQUFDLENBQUM7WUFFL0QsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO2dCQUN6QixJQUFJLENBQUMsSUFBSSxDQUFDLHFEQUFxRCxDQUFDLENBQUM7Z0JBQ2pFLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN0QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLEVBQUU7WUFDcEUsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLGVBQWUsRUFBRSxDQUFDO2dCQUNoQyxnRkFBZ0Y7Z0JBQ2hGLDRFQUE0RTtnQkFDNUUsZ0JBQWdCO2dCQUNoQixNQUFNLElBQUksQ0FBQyxRQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3BELENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosb0VBQW9FO1FBQ3BFLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxDQUFDO1FBQ3ZELElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztRQUNwQixLQUFLLE1BQU0sT0FBTyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUM7WUFDN0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsWUFBWSxFQUFFLENBQUM7Z0JBQ2hFLDBFQUEwRTtnQkFDMUUsTUFBTTtZQUNQLENBQUM7WUFDRCxLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNwRCxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssZUFBZSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDdkYsU0FBUztnQkFDVixDQUFDO2dCQUNELElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQztvQkFDekIsU0FBUztnQkFDVixDQUFDO2dCQUNELEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUMvQixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDN0MsT0FBTyxHQUFHLElBQUksQ0FBQztnQkFDaEIsQ0FBQztnQkFDRCxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVMsQ0FBQztZQUMxQixDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixNQUFNLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixFQUFFLG9CQUFvQixFQUFFLEtBQUssRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ3RPLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ3BELE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUV4RCxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUMvQixDQUFDO1FBQ0QsT0FBTyxDQUFDLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFLENBQUM7UUFFeEQsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQy9DLCtDQUEwQjtRQUMzQixDQUFDO2FBQU0sQ0FBQztZQUNQLG1EQUE0QjtRQUM3QixDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyw2Q0FBc0IsQ0FBQyxPQUE2QjtRQUNqRSxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzFCLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFM0IsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFFMUIsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbkMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDNUIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDakQsQ0FBQztRQUVELElBQUksT0FBTyx1QkFBZSxDQUFDO1FBQzNCLElBQUksT0FBc0MsQ0FBQztRQUUzQyxNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQzlCLE1BQU0sS0FBSyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDcEMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDakQsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFlBQVksRUFBRSxDQUFDO2dCQUM3QixPQUFPLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQztnQkFDcEIsT0FBTyxnQ0FBdUIsQ0FBQztnQkFDL0IsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuRSxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUM5QyxJQUFJLENBQUMsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3RELE9BQU8sR0FBRyxDQUFDLENBQUM7WUFDWixPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3RCLE9BQU8sT0FBTyxDQUFDLFFBQVEsQ0FBQztZQUN4QixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ2hELElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDaEQsQ0FBQztRQUVELE1BQU0sT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3JCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUdoQixJQUFJLE9BQU8sR0FBRyxDQUFDLDhEQUE2QyxDQUFDLEVBQUUsQ0FBQztZQUMvRCxtQ0FBb0I7UUFDckIsQ0FBQztRQUVELElBQUksT0FBTyxnQ0FBd0IsRUFBRSxDQUFDO1lBQ3JDLGlDQUFtQjtRQUNwQixDQUFDO1FBRUQsSUFBSSxPQUFPLGlDQUF5QixFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2xDLGlDQUFvQjtRQUNyQixDQUFDO1FBRUQsSUFBSSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDNUIsbURBQTRCO1FBQzdCLENBQUM7UUFHRCwrQ0FBMEI7SUFDM0IsQ0FBQztJQUdPLEtBQUssQ0FBQyx5Q0FBb0IsQ0FBQyxPQUE2QjtRQUMvRCxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzFCLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDM0IsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFFdEQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVyQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUNwQyxNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDO1FBRXRDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNwQixVQUFVLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTdCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2xDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV6QyxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsT0FBTyxDQUFDO1FBQzdCLE1BQU0sZUFBZSxHQUFHLElBQUksZUFBZSxFQUFRLENBQUM7UUFFcEQsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUVwQyxNQUFNLG1CQUFtQixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSx1QkFBdUIsRUFBRSxDQUFDLENBQUM7UUFDckUsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDO1FBQ3hELE1BQU0scUJBQXFCLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2pELE1BQU0scUJBQXFCLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUUxQyx1REFBdUQ7UUFDdkQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLG9EQUEwQyxDQUFDO1FBQ2xGLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDO1lBQzFCLDJCQUEyQixFQUFFLEtBQUs7U0FDbEMsQ0FBQyxDQUFDO1FBQ0gsS0FBSyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQzNCLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDO2dCQUMxQiwyQkFBMkIsRUFBRSxRQUFRO2FBQ3JDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFHSixJQUFJLElBQUksOENBQThHLENBQUM7UUFDdkgsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDcEQsSUFBSSxDQUFDLElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUMzRCxJQUFJLENBQUMsWUFBWSxDQUFDLDhCQUE4QixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN0RSxJQUFJLE9BQU8saUNBQXlCLEVBQUUsQ0FBQztnQkFDdEMsSUFBSSw4QkFBZSxDQUFDO1lBQ3JCLENBQUM7aUJBQU0sSUFBSSxPQUFPLGdDQUF3QixFQUFFLENBQUM7Z0JBQzVDLElBQUksNEJBQWMsQ0FBQztZQUNwQixDQUFDO2lCQUFNLElBQUksT0FBTyxpQ0FBeUIsRUFBRSxDQUFDO2dCQUM3QyxJQUFJLDRCQUFlLENBQUM7WUFDckIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxFQUFFO1lBQ3pDLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxlQUFlLElBQUksQ0FBQyxDQUFDLFNBQVMsS0FBSyxPQUFPLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzlELG1CQUFtQixDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUM3QixlQUFlLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQzNCLElBQUksQ0FBQyxDQUFDLE1BQU0sNENBQW9DLEVBQUUsQ0FBQztvQkFDbEQsSUFBSSwwQ0FBcUIsQ0FBQztnQkFDM0IsQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksOEJBQWUsQ0FBQztnQkFDckIsQ0FBQztnQkFDRCxPQUFPO1lBQ1IsQ0FBQztZQUNELElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDdkIsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDMUIsTUFBTSxHQUFHLEdBQXFCLENBQUMsR0FBVyxFQUFFLEdBQUcsSUFBVyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO2dCQUVqSSxHQUFHLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBRTdDLHdGQUF3RjtnQkFDeEYsc0NBQXNDO2dCQUN0QyxNQUFNLGdCQUFnQixHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGlDQUF5QixDQUFDO2dCQUMxRixNQUFNLFVBQVUsR0FBRyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFFdEksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO29CQUNqQixHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQztvQkFDN0IsT0FBTztnQkFDUixDQUFDO2dCQUVELE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDMUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO29CQUN2RCxHQUFHLENBQUMsNEVBQTRFLENBQUMsQ0FBQztvQkFDbEYsT0FBTztnQkFDUixDQUFDO2dCQUVELElBQUksSUFBSSxDQUFDLHlCQUF5QixDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7b0JBQ3BFLEdBQUcsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO29CQUN4QyxPQUFPO2dCQUNSLENBQUM7Z0JBRUQsTUFBTSxVQUFVLEdBQUcsTUFBTSxJQUFJLENBQUMseUJBQXlCLENBQUMsYUFBYSxDQUNwRSxTQUFTLEVBQ1Q7b0JBQ0MsT0FBTyxFQUFFLElBQUksQ0FBQyxRQUFRO2lCQUN0QixFQUNELGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsMkNBQTJDO2dCQUdyRSx1QkFBcUIsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsZUFBZSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7Z0JBRTNFLElBQUksOEJBQWUsQ0FBQztnQkFDcEIsZUFBZSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUUzQixPQUFPO1lBQ1IsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSix5Q0FBeUM7UUFDekMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLEVBQUU7WUFDbkYsSUFBSSxDQUFDLFlBQVksQ0FBQyw4QkFBOEIsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdkUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztRQUNuQixJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUM7UUFFekIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixFQUFFLENBQUM7UUFDdkQsSUFBSSxjQUE4QyxDQUFDO1FBRW5ELGNBQWM7UUFDZCxNQUFNLGNBQWMsR0FBRyxHQUFHLEVBQUU7WUFFM0IsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7WUFFOUIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUNyQixjQUFjLEdBQW1DLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssZUFBZSxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDMUssQ0FBQztZQUVELElBQUksY0FBYyxFQUFFLENBQUM7Z0JBRXBCLGNBQWMsQ0FBQyxLQUFLLEtBQUssU0FBUyxDQUFDO2dCQUVuQyxNQUFNLEtBQUssR0FBRyxjQUFjLENBQUMsS0FBSyxDQUFDO2dCQUNuQyxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUN6QyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBRXpCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLGFBQWEsUUFBUSxDQUFDLE1BQU0sUUFBUSxDQUFDLENBQUM7b0JBRTNGLGNBQWM7b0JBQ2QsVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7b0JBQzFCLDJCQUEyQixDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO29CQUNwRSxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFFOUIscUJBQXFCLENBQUMsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFO3dCQUV0QyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsUUFBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQzt3QkFFckUsa0ZBQWtGO3dCQUNsRixpRkFBaUY7d0JBQ2pGLHlCQUF5Qjt3QkFDekIsS0FBSyxNQUFNLEtBQUssSUFBSSxRQUFRLEVBQUUsQ0FBQzs0QkFDOUIsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRTtnQ0FDOUIsUUFBUSxFQUFFLDJCQUEyQixDQUFDLEtBQUs7Z0NBQzNDLEtBQUssRUFBRSxtQkFBbUIsQ0FBQyxLQUFLOzZCQUNoQyxFQUFFLGFBQWEsQ0FBQyxDQUFDOzRCQUVsQixhQUFhLEdBQUcsS0FBSyxDQUFDO3dCQUN2QixDQUFDO3dCQUVELGlGQUFpRjt3QkFDakYsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQUM7d0JBQ3BFLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDOzRCQUMvRSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFTLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDdEUsQ0FBQztvQkFDRixDQUFDLENBQUMsQ0FBQztnQkFDSixDQUFDO1lBQ0YsQ0FBQztZQUVELElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUN6QixtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDN0IsZUFBZSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBRTVCLENBQUM7aUJBQU0sSUFBSSxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ2hDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUM1QixDQUFDO1FBQ0YsQ0FBQyxDQUFDO1FBQ0YsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7UUFDaEQsY0FBYyxFQUFFLENBQUM7UUFFakIsNkNBQTZDO1FBQzdDLHVFQUF1RTtRQUN2RSxNQUFNLGVBQWUsQ0FBQyxDQUFDLENBQUM7UUFDeEIsTUFBTSxxQkFBcUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUV2QyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEVBQUUsWUFBWSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUN2RixNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzFELENBQUM7UUFFRCxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFaEIsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxvQkFBb0IsRUFBRSxLQUFLLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUN0TyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNwRCxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFeEQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUd0QyxJQUFJLFdBQWlDLENBQUM7UUFFdEMsSUFBSSxRQUFRLENBQUMsTUFBTSxFQUFFLFlBQVksRUFBRSxDQUFDO1lBQ25DLHlEQUF5RDtRQUUxRCxDQUFDO2FBQU0sSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDakQsd0JBQXdCO1lBQ3hCLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxPQUFPLEVBQUUsb0RBQW9ELENBQUMsQ0FBQztZQUN2RixJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxFQUFFLE9BQU8sRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUVuRSxDQUFDO2FBQU0sQ0FBQztZQUNQLDhCQUE4QjtZQUM5QixJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3hDLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDdEQsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLG9GQUFvRjtZQUNwRixzQ0FBc0M7WUFDdEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUM5QyxJQUFJLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUMzQyxJQUFJLFFBQVEsQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDLGVBQWUsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDekQsV0FBVyxHQUFHLFFBQVEsQ0FBQztnQkFDeEIsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxXQUFXLEdBQUcsUUFBUSxDQUFDO1lBQ3hCLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFN0QsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRU8sS0FBSyxDQUFBLDJCQUFhO1FBRXpCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUVwQixJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUM7UUFDNUIsSUFBSSxDQUFDLFFBQVEsR0FBRyxTQUFTLENBQUM7SUFDM0IsQ0FBQztJQUVPLEtBQUssQ0FBQSwyQkFBYztRQUMxQixVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzFCLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDM0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUUzQixJQUFJLENBQUM7WUFDSixNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDOUIsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLDBCQUEwQixFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEcsSUFBSSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1lBQ3JDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDaEIsQ0FBQztRQUVELElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNwQixJQUFJLENBQUMseUJBQXlCLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUc3RCxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxDQUFDO1FBQzFCLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLElBQUksQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFDO0lBQzNCLENBQUM7SUFFTyxLQUFLLENBQUEsNkJBQWM7UUFFMUIsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBRXBCLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ25CLDZCQUE2QjtZQUM3QixVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQzNCLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLENBQUM7WUFFM0Isb0ZBQW9GO1lBQ3BGLE1BQU0sV0FBVyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7WUFDeEosSUFBSSxlQUFlLEdBQTBCLEVBQUUsQ0FBQztZQUNoRCxJQUFJLENBQUM7Z0JBQ0osZUFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDM0MsQ0FBQztZQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7Z0JBQ2QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSw0QkFBNEIsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN0RyxJQUFJLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUM7Z0JBQ3ZDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDaEIsQ0FBQztZQUVELElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDN0IsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDakIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUM7WUFDeEgsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzlELENBQUM7UUFDRixDQUFDO1FBR0QsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsQ0FBQztRQUMxQixJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixJQUFJLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQztJQUMzQixDQUFDO0lBRUQsT0FBTztJQUVDLFdBQVcsQ0FBQyxXQUFvQixLQUFLLEVBQUUsZ0JBQXlCLEtBQUssRUFBRSxRQUFtQjtRQUNqRyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTNCLElBQUksY0FBd0IsQ0FBQztRQUM3QixJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QseUJBQXlCO1lBQ3pCLGNBQWMsR0FBRyxRQUFRLENBQUM7UUFDM0IsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLENBQUM7WUFDeEMsMkNBQTJDO1lBQzNDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLFVBQVUsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDbEQsY0FBYyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4RCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsY0FBYyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQztZQUM5QyxDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxpQ0FBaUM7WUFDakMsY0FBYyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRSxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUN6RyxjQUFjLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1RixDQUFDO1FBRUQsSUFBSSxhQUFhLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMscUNBQTJCLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsRixJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyx5SEFBeUg7UUFDOUssQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLENBQUM7Z0JBQ2pDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQ3hELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDckMsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLGNBQWMsQ0FBQztJQUN2QixDQUFDO0lBRU8sWUFBWTtRQUVuQixJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzNCLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFekIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUM7UUFFMUIsbUZBQW1GO1FBQ25GLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDdEIsQ0FBQztJQUNGLENBQUM7SUFFTyxzQkFBc0I7UUFFN0IsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRywwQ0FBNkIsQ0FBQztZQUN2RCxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sWUFBWSxHQUFHLENBQUMsUUFBbUIsRUFBVyxFQUFFO1lBQ3JELE9BQU8sUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLGVBQWUsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3ZILENBQUMsQ0FBQztRQUVGLElBQUksWUFBWSwyQ0FBOEIsQ0FBQztRQUMvQyxLQUFLLE1BQU0sT0FBTyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUM7WUFDN0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDdkIsU0FBUztZQUNWLENBQUM7WUFDRCxZQUFZLG1EQUFrQyxDQUFDO1lBQy9DLElBQUksWUFBWSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDN0MsWUFBWSxtRUFBMEMsQ0FBQztnQkFDdkQsTUFBTSxDQUFDLDJCQUEyQjtZQUNuQyxDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDeEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsWUFBWSw2Q0FBZ0MsQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFFTyw2QkFBNkI7UUFDcEMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUUxQixNQUFNLElBQUksR0FBRyxJQUFJLHdCQUF3QixFQUFFLENBQUM7UUFDNUMsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQztZQUNuRSxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQztZQUM1QyxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUM7UUFFbEIsT0FBTztZQUNOLElBQUksRUFBRSxjQUFjO1lBQ3BCLE9BQU8sRUFBRSxDQUFDO1NBQ1YsQ0FBQztJQUNILENBQUM7SUFFTyxLQUFLLENBQUMsWUFBWSxDQUFDLEtBQWlCLEVBQUUsSUFBeUMsRUFBRSxjQUF1QjtRQUMvRyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzFCLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFM0IsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdEgsSUFBSSxDQUFDLElBQUksQ0FBQyx3REFBd0QsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFFOUgsSUFBSSxnQkFBZ0IsRUFBRSxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDcEMscUJBQXFCO1lBQ3JCLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxXQUFXLEdBQUcsQ0FBQyxJQUFJLElBQUksZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDekUsTUFBTSxjQUFjLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7UUFFakUsTUFBTSxhQUFhLEdBQWtCO1lBQ3BDLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsR0FBRyxJQUFJO1lBQ25FLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsR0FBRyxLQUFLO1NBQ25FLENBQUM7UUFFRixJQUFJLElBQUksRUFBRSxDQUFDO1lBQ1YsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLGNBQWMsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ2xHLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ2pGLENBQUM7SUFDRixDQUFDO0lBRU8sa0JBQWtCO1FBQ3pCLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsV0FBVyxJQUFJLEVBQUUsQ0FBQztJQUM1RSxDQUFDO0lBRU8sWUFBWSxDQUFDLElBQVksRUFBRSxTQUFTLEdBQUcsSUFBSTtRQUVsRCxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoRCxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsTUFBTSxZQUFZLEdBQUcsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDckUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3pFLENBQUM7SUFDRixDQUFDO0lBRUQsc0JBQXNCO0lBRXRCLFFBQVEsQ0FBQyxFQUFXO1FBQ25CLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUN4RCxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUM5QyxNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDO1lBQy9DLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDO1lBQ2pELElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQzFELElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDdEIsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQy9CLENBQUM7SUFFRCxLQUFLLENBQUMsVUFBVTtRQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3ZDLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFDO1FBQ3hCLElBQUksUUFBd0MsQ0FBQztRQUU3QyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLEdBQUcsQ0FBQztRQUN6QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUN2RCxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3ZCLFNBQVM7WUFDVixDQUFDO1lBQ0QsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDcEQsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLGVBQWUsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUM3RCxtQ0FBbUM7b0JBQ25DLFdBQVcsR0FBRyxXQUFXLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7b0JBQzFELFFBQVEsR0FBRyxJQUFJLENBQUM7Z0JBQ2pCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7UUFFeEMsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDckIsUUFBUSxDQUFDLEtBQUssR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzNCLFFBQVEsQ0FBQyxLQUFNLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQztRQUM3QixDQUFDO1FBRUQsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUVuRixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDdEIsQ0FBQztJQUVELGFBQWE7UUFDWixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUM7UUFDekUsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUM7Z0JBQ2xDLFNBQVMsRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVM7Z0JBQ3JDLFNBQVMsRUFBRSxRQUFRLENBQUMsU0FBUztnQkFDN0IsT0FBTyxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDM0IsT0FBTyxFQUFFLFFBQVEsQ0FBQyxZQUFZLEVBQUUsSUFBSTtnQkFDcEMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNO2dCQUN2QixNQUFNLEVBQUU7b0JBQ1AsSUFBSSxFQUFFLFlBQVk7b0JBQ2xCLE1BQU0sRUFBRSxVQUFVO2lCQUNsQjthQUNELENBQUMsQ0FBQztRQUNKLENBQUM7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZ0NBQXdCLENBQUM7SUFDN0MsQ0FBQztJQUVELFVBQVUsQ0FBQyxRQUEwQjtRQUNwQyxPQUFPLElBQUksQ0FBQyxTQUFTLEVBQUUsaUJBQWlCLENBQUMsUUFBUSw0QkFBb0IsQ0FBQztJQUN2RSxDQUFDO0lBRUQsV0FBVyxDQUFDLFFBQTBCO1FBQ3JDLE9BQU8sSUFBSSxDQUFDLFNBQVMsRUFBRSxpQkFBaUIsQ0FBQyxRQUFRLDZCQUFxQixDQUFDO0lBQ3hFLENBQUM7SUFFRCxVQUFVLENBQUMsUUFBMEI7UUFDcEMsT0FBTyxJQUFJLENBQUMsU0FBUyxFQUFFLGlCQUFpQixDQUFDLFFBQVEsZ0NBQXdCLENBQUM7SUFDM0UsQ0FBQztJQUVELFFBQVEsQ0FBQyxJQUFhO1FBQ3JCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNiLElBQUksQ0FBQyxTQUFTLEVBQUUsaUJBQWlCLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLDZCQUFxQixDQUFDLDRCQUFvQixDQUFDLENBQUM7SUFDaEcsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhO1FBQ2xCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUM7UUFDaEUsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUM7Z0JBQ2xDLFNBQVMsRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVM7Z0JBQ3JDLFNBQVMsRUFBRSxRQUFRLENBQUMsU0FBUztnQkFDN0IsT0FBTyxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDM0IsT0FBTyxFQUFFLFFBQVEsQ0FBQyxZQUFZLEVBQUUsSUFBSTtnQkFDcEMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNO2dCQUN2QixNQUFNLEVBQUU7b0JBQ1AsSUFBSSxFQUFFLFlBQVk7b0JBQ2xCLE1BQU0sRUFBRSxXQUFXO2lCQUNuQjthQUNELENBQUMsQ0FBQztRQUNKLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZ0NBQXdCLENBQUM7SUFDN0MsQ0FBQztJQUVELFdBQVc7UUFDVixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDO1FBQ2hFLElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDO2dCQUNsQyxTQUFTLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxTQUFTO2dCQUNyQyxTQUFTLEVBQUUsUUFBUSxDQUFDLFNBQVM7Z0JBQzdCLE9BQU8sRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQzNCLE9BQU8sRUFBRSxRQUFRLENBQUMsWUFBWSxFQUFFLElBQUk7Z0JBQ3BDLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTTtnQkFDdkIsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRTthQUN2QixDQUFDLENBQUM7UUFDSixDQUFDO0lBQ0YsQ0FBQztJQUVELGtCQUFrQjtRQUNqQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQztRQUNyRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFRCxjQUFjO1FBQ2IsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQ3pCLENBQUM7SUFFRCxJQUFJLFFBQVE7UUFDWCxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDbEMsQ0FBQztDQUNELENBQUE7QUFqL0JZLHFCQUFxQjtJQWdDL0IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHlCQUF5QixDQUFBO0lBQ3pCLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsY0FBYyxDQUFBO0lBQ2QsWUFBQSxzQkFBc0IsQ0FBQTtHQXpDWixxQkFBcUIsQ0FpL0JqQzs7QUFFTSxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFxQjs7YUFFakIsT0FBRSxHQUFHLHNDQUFzQyxBQUF6QyxDQUEwQztJQUU1RCxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQW1CO1FBQzdCLE9BQU8sTUFBTSxDQUFDLGVBQWUsQ0FBd0IsdUJBQXFCLENBQUMsRUFBRSxDQUFDLElBQUksU0FBUyxDQUFDO0lBQzdGLENBQUM7SUFTRCxJQUFJLE1BQU07UUFDVCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztJQUNoQyxDQUFDO0lBRUQsSUFBSSxRQUFRO1FBQ1gsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCxZQUNrQixPQUFvQixFQUNkLGFBQXFELEVBQ3BELHNCQUErRCxFQUM1RCxtQkFBK0QsRUFDdEUsaUJBQXFDLEVBQ3JDLGlCQUFxQztRQUx4QyxZQUFPLEdBQVAsT0FBTyxDQUFhO1FBQ0csa0JBQWEsR0FBYixhQUFhLENBQXVCO1FBQ25DLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBd0I7UUFDM0Msd0JBQW1CLEdBQW5CLG1CQUFtQixDQUEyQjtRQW5CMUUsV0FBTSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDL0IsMkJBQXNCLEdBQUcsZUFBZSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN0RCx3QkFBbUIsR0FBRyxlQUFlLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBc0JuRSxNQUFNLG9CQUFvQixHQUFHLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBRS9FLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxJQUFJLENBQXVCLEdBQUcsRUFBRTtZQUdoRCxNQUFNLFFBQVEsR0FBK0I7Z0JBQzVDLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxNQUFNO2dCQUNsQyxXQUFXLEVBQUUsR0FBRyxFQUFFO29CQUNqQixVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO29CQUVwQyxPQUFPO3dCQUNOLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxNQUFNO3dCQUM5QixTQUFTLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUU7d0JBQ3RDLFFBQVEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLEdBQUc7d0JBQ3JDLFVBQVUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRTtxQkFDdkMsQ0FBQztnQkFDSCxDQUFDO2FBQ0QsQ0FBQztZQUVGLDJCQUEyQjtZQUMzQixvREFBb0Q7WUFDcEQsaUVBQWlFO1lBQ2pFLHlCQUF5QjtZQUN6QixLQUFLLE1BQU0sY0FBYyxJQUFJLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUM7Z0JBQ2hGLEtBQUssTUFBTSxDQUFDLEVBQUUsVUFBVSxDQUFDLElBQUksY0FBYyxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUN6RCxJQUFJLFVBQVUsS0FBSyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7d0JBQ2pDLFFBQVEsQ0FBQyxRQUFRLEdBQUcsaUJBQWlCLENBQUMsUUFBUSxDQUFDO3dCQUMvQyxNQUFNO29CQUNQLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsRUFDcEUsUUFBUSxFQUNSO2dCQUNDLGdCQUFnQixFQUFFLFVBQVU7Z0JBQzVCLGVBQWUsRUFBRTtvQkFDaEIsd0JBQXdCLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJO2lCQUN0QzthQUNELEVBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FDWixDQUFDO1lBRUYsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBRTlDLE9BQU8sTUFBTSxDQUFDO1FBQ2YsQ0FBQyxDQUFDLENBQUM7UUFHSCxNQUFNLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVoRCxNQUFNLGNBQWMsR0FBRyx5QkFBeUIsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUVoRyxJQUFJLENBQUMsZUFBZSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNsQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZCLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RDLE1BQU0sS0FBSyxHQUFHLEtBQUssSUFBSSxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2xFLE9BQU8sS0FBSyxJQUFJLFNBQVMsQ0FBQztRQUMzQixDQUFDLENBQUMsQ0FBQztRQUdILElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUMzQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3QyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2QsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQy9DLE9BQU87WUFDUixDQUFDO1lBQ0QsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDO1lBQ3JCLEtBQUssTUFBTSxNQUFNLElBQUksaUJBQWlCLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQztnQkFDMUQsSUFBSSxPQUFPLENBQUMsdUJBQXFCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQztvQkFDM0UsUUFBUSxHQUFHLElBQUksQ0FBQztvQkFDaEIsTUFBTTtnQkFDUCxDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksQ0FBQyxRQUFRLElBQUksT0FBTyxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUM7Z0JBQzNDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQy9DLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosTUFBTSxpQkFBaUIsR0FBRyxlQUFlLENBQWtDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztRQUU1RixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUU3QyxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRWxELElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDckMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDNUMsT0FBTztZQUNSLENBQUM7WUFFRCxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsT0FBTyxDQUFDO1lBQzlCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUQsTUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLFdBQVcsRUFBRSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUM7WUFHM0QsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO1lBRTVELEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDbkMsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFlBQVksRUFBRSxDQUFDO29CQUM3QixXQUFXLENBQUMsRUFBRSxDQUFDLEVBQUU7d0JBQ2hCLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO3dCQUMzQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUN0QyxDQUFDLENBQUMsQ0FBQztvQkFDSCxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQztvQkFDL0IsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO3dCQUNmLE9BQU87b0JBQ1IsQ0FBQztvQkFDRCxnQkFBZ0IsQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLEVBQUU7d0JBRXZELElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUM7NEJBQzFCLE9BQU87d0JBQ1IsQ0FBQzt3QkFFRCxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLFlBQVk7K0JBQy9DLFFBQVEsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLFNBQVM7K0JBQ3ZDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxlQUFlO21DQUNsRSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDO21DQUNyQixPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLG9CQUFvQjt3QkFFeEQsSUFBSSxVQUFVLEVBQUUsQ0FBQzs0QkFDaEIsaUJBQWlCLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQzt3QkFDM0MsQ0FBQztvQkFDRixDQUFDLENBQUMsQ0FBQztnQkFDSixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVKLElBQUksYUFBYSxJQUFJLGFBQWEsRUFBRSxDQUFDO2dCQUNwQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzNDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzdDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBRTNCLE1BQU0sT0FBTyxHQUFHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUUxQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2QsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUM7Z0JBQzVCLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDaEIsb0JBQW9CLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDOUIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDL0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ3hELElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDaEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztnQkFDaEQsQ0FBQztnQkFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUyxDQUFDLENBQUM7Z0JBQ3BELElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDaEMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLG9CQUFvQixDQUFDLEdBQUcsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDO1lBQ3BGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3ZCLENBQUM7SUFFRCw0QkFBNEI7UUFDM0IsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ2hELElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUVELGlCQUFpQjtRQUNoQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQztJQUN0QyxDQUFDO0lBRUQsS0FBSztRQUNKLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRUQsb0JBQW9CO1FBQ25CLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQTBCO1FBQ25DLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFFcEMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFFNUIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLENBQUM7UUFDeEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUM7ZUFDckQsTUFBTSxJQUFJLENBQUMsbUJBQW1CLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTdGLElBQUksR0FBRyxJQUFJLG9CQUFvQixDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDN0QsSUFBSSxHQUFHLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ3RCLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUM1QyxDQUFDO1lBQ0QsSUFBSSxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDMUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDakQsQ0FBQztZQUNELElBQUksR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNqQixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3pELElBQUksR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUNsQixNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3hELENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRTNELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxHQUFHLEVBQUUsMENBQWtDLENBQUM7UUFDckcsT0FBTyxDQUFDLFFBQVEsQ0FBQztJQUNsQixDQUFDO0lBRUQsYUFBYTtRQUNaLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDekMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNoQyxDQUFDOztBQWxQVyxxQkFBcUI7SUF5Qi9CLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxzQkFBc0IsQ0FBQTtJQUN0QixXQUFBLHlCQUF5QixDQUFBO0lBQ3pCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxrQkFBa0IsQ0FBQTtHQTdCUixxQkFBcUIsQ0FtUGpDOztBQUVELE1BQU0sQ0FBQyxLQUFLLFVBQVUsV0FBVyxDQUFDLFFBQTBCLEVBQUUsTUFBbUIsRUFBRSxNQUFpQyxFQUFFLEtBQXdCO0lBQzdJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztRQUN4QixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQy9DLE1BQU0sa0JBQWtCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBRTdELE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLENBQUM7SUFDbEMsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBRW5GLE1BQU0sV0FBVyxHQUFHLE1BQU0sa0JBQWtCLENBQUMsb0JBQW9CLENBQUMsU0FBUyxDQUFDLENBQUM7SUFFN0UsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUNwQyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3JCLEtBQUssQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7SUFFdkIsU0FBUztJQUNULE1BQU0sV0FBVyxHQUFHLFNBQVMsRUFBRSxVQUFVLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN6RixVQUFVLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2pDLFdBQVcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUN0RixJQUFJLEtBQUssRUFBRSxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUVsQyxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1lBQ25DLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDOUIsTUFBTTtRQUNQLENBQUM7UUFFRCxXQUFXLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDMUYsQ0FBQztJQUNELFdBQVcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUVyRixJQUFJLENBQUMsS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7UUFDcEMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNqQyxDQUFDO0lBRUQsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQzdCLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUNELE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLE9BQU8sS0FBSywwQ0FBa0MsSUFBSSxLQUFLLDBDQUFrQyxDQUFDO0lBQzNGLENBQUMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxXQUFXLEdBQUcsWUFBWSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUVyRCxNQUFNLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUUzQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFFaEIsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDO0FBR0QsS0FBSyxVQUFVLGVBQWUsQ0FBQyxRQUEwQixFQUFFLEtBQTRCO0lBRXRGLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDakQsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUUvQyxNQUFNLE1BQU0sR0FBRyxNQUFNLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUVoRCxJQUFJLE1BQU0sSUFBSSxNQUFNLENBQUMsU0FBUyxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQ3pDLEtBQUssTUFBTSxPQUFPLElBQUksS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUM7WUFDbkQsTUFBTSxXQUFXLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUMzRSxDQUFDO1FBQ0QsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUM7SUFDM0IsQ0FBQztBQUNGLENBQUMifQ==