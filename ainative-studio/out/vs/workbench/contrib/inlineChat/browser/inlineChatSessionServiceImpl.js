var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { Schemas } from '../../../../base/common/network.js';
import { autorun } from '../../../../base/common/observable.js';
import { isEqual } from '../../../../base/common/resources.js';
import { assertType } from '../../../../base/common/types.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { isCodeEditor, isCompositeEditor, isDiffEditor } from '../../../../editor/browser/editorBrowser.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { createTextBufferFactoryFromSnapshot } from '../../../../editor/common/model/textModel.js';
import { IEditorWorkerService } from '../../../../editor/common/services/editorWorker.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { DEFAULT_EDITOR_ASSOCIATION } from '../../../common/editor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { UntitledTextEditorInput } from '../../../services/untitled/common/untitledTextEditorInput.js';
import { IChatWidgetService } from '../../chat/browser/chat.js';
import { IChatAgentService } from '../../chat/common/chatAgents.js';
import { IChatService } from '../../chat/common/chatService.js';
import { ChatAgentLocation } from '../../chat/common/constants.js';
import { CTX_INLINE_CHAT_HAS_AGENT, CTX_INLINE_CHAT_HAS_AGENT2, CTX_INLINE_CHAT_POSSIBLE } from '../common/inlineChat.js';
import { HunkData, Session, SessionWholeRange, StashedSession } from './inlineChatSession.js';
export class InlineChatError extends Error {
    static { this.code = 'InlineChatError'; }
    constructor(message) {
        super(message);
        this.name = InlineChatError.code;
    }
}
let InlineChatSessionServiceImpl = class InlineChatSessionServiceImpl {
    constructor(_telemetryService, _modelService, _textModelService, _editorWorkerService, _logService, _instaService, _editorService, _textFileService, _languageService, _chatService, _chatAgentService, _chatWidgetService) {
        this._telemetryService = _telemetryService;
        this._modelService = _modelService;
        this._textModelService = _textModelService;
        this._editorWorkerService = _editorWorkerService;
        this._logService = _logService;
        this._instaService = _instaService;
        this._editorService = _editorService;
        this._textFileService = _textFileService;
        this._languageService = _languageService;
        this._chatService = _chatService;
        this._chatAgentService = _chatAgentService;
        this._chatWidgetService = _chatWidgetService;
        this._store = new DisposableStore();
        this._onWillStartSession = this._store.add(new Emitter());
        this.onWillStartSession = this._onWillStartSession.event;
        this._onDidMoveSession = this._store.add(new Emitter());
        this.onDidMoveSession = this._onDidMoveSession.event;
        this._onDidEndSession = this._store.add(new Emitter());
        this.onDidEndSession = this._onDidEndSession.event;
        this._onDidStashSession = this._store.add(new Emitter());
        this.onDidStashSession = this._onDidStashSession.event;
        this._sessions = new Map();
        this._keyComputers = new Map();
        // ---- NEW
        this._sessions2 = new ResourceMap();
        this._onDidChangeSessions = this._store.add(new Emitter());
        this.onDidChangeSessions = this._onDidChangeSessions.event;
    }
    dispose() {
        this._store.dispose();
        this._sessions.forEach(x => x.store.dispose());
        this._sessions.clear();
    }
    async createSession(editor, options, token) {
        const agent = this._chatAgentService.getDefaultAgent(ChatAgentLocation.Editor);
        if (!agent) {
            this._logService.trace('[IE] NO agent found');
            return undefined;
        }
        this._onWillStartSession.fire(editor);
        const textModel = editor.getModel();
        const selection = editor.getSelection();
        const store = new DisposableStore();
        this._logService.trace(`[IE] creating NEW session for ${editor.getId()}, ${agent.extensionId}`);
        const chatModel = options.session?.chatModel ?? this._chatService.startSession(ChatAgentLocation.Editor, token);
        if (!chatModel) {
            this._logService.trace('[IE] NO chatModel found');
            return undefined;
        }
        store.add(toDisposable(() => {
            const doesOtherSessionUseChatModel = [...this._sessions.values()].some(data => data.session !== session && data.session.chatModel === chatModel);
            if (!doesOtherSessionUseChatModel) {
                this._chatService.clearSession(chatModel.sessionId);
                chatModel.dispose();
            }
        }));
        const lastResponseListener = store.add(new MutableDisposable());
        store.add(chatModel.onDidChange(e => {
            if (e.kind !== 'addRequest' || !e.request.response) {
                return;
            }
            const { response } = e.request;
            session.markModelVersion(e.request);
            lastResponseListener.value = response.onDidChange(() => {
                if (!response.isComplete) {
                    return;
                }
                lastResponseListener.clear(); // ONCE
                // special handling for untitled files
                for (const part of response.response.value) {
                    if (part.kind !== 'textEditGroup' || part.uri.scheme !== Schemas.untitled || isEqual(part.uri, session.textModelN.uri)) {
                        continue;
                    }
                    const langSelection = this._languageService.createByFilepathOrFirstLine(part.uri, undefined);
                    const untitledTextModel = this._textFileService.untitled.create({
                        associatedResource: part.uri,
                        languageId: langSelection.languageId
                    });
                    untitledTextModel.resolve();
                    this._textModelService.createModelReference(part.uri).then(ref => {
                        store.add(ref);
                    });
                }
            });
        }));
        store.add(this._chatAgentService.onDidChangeAgents(e => {
            if (e === undefined && (!this._chatAgentService.getAgent(agent.id) || !this._chatAgentService.getActivatedAgents().map(agent => agent.id).includes(agent.id))) {
                this._logService.trace(`[IE] provider GONE for ${editor.getId()}, ${agent.extensionId}`);
                this._releaseSession(session, true);
            }
        }));
        const id = generateUuid();
        const targetUri = textModel.uri;
        // AI edits happen in the actual model, keep a reference but make no copy
        store.add((await this._textModelService.createModelReference(textModel.uri)));
        const textModelN = textModel;
        // create: keep a snapshot of the "actual" model
        const textModel0 = store.add(this._modelService.createModel(createTextBufferFactoryFromSnapshot(textModel.createSnapshot()), { languageId: textModel.getLanguageId(), onDidChange: Event.None }, targetUri.with({ scheme: Schemas.vscode, authority: 'inline-chat', path: '', query: new URLSearchParams({ id, 'textModel0': '' }).toString() }), true));
        // untitled documents are special and we are releasing their session when their last editor closes
        if (targetUri.scheme === Schemas.untitled) {
            store.add(this._editorService.onDidCloseEditor(() => {
                if (!this._editorService.isOpened({ resource: targetUri, typeId: UntitledTextEditorInput.ID, editorId: DEFAULT_EDITOR_ASSOCIATION.id })) {
                    this._releaseSession(session, true);
                }
            }));
        }
        let wholeRange = options.wholeRange;
        if (!wholeRange) {
            wholeRange = new Range(selection.selectionStartLineNumber, selection.selectionStartColumn, selection.positionLineNumber, selection.positionColumn);
        }
        if (token.isCancellationRequested) {
            store.dispose();
            return undefined;
        }
        const session = new Session(options.headless ?? false, targetUri, textModel0, textModelN, agent, store.add(new SessionWholeRange(textModelN, wholeRange)), store.add(new HunkData(this._editorWorkerService, textModel0, textModelN)), chatModel, options.session?.versionsByRequest);
        // store: key -> session
        const key = this._key(editor, session.targetUri);
        if (this._sessions.has(key)) {
            store.dispose();
            throw new Error(`Session already stored for ${key}`);
        }
        this._sessions.set(key, { session, editor, store });
        return session;
    }
    moveSession(session, target) {
        const newKey = this._key(target, session.targetUri);
        const existing = this._sessions.get(newKey);
        if (existing) {
            if (existing.session !== session) {
                throw new Error(`Cannot move session because the target editor already/still has one`);
            }
            else {
                // noop
                return;
            }
        }
        let found = false;
        for (const [oldKey, data] of this._sessions) {
            if (data.session === session) {
                found = true;
                this._sessions.delete(oldKey);
                this._sessions.set(newKey, { ...data, editor: target });
                this._logService.trace(`[IE] did MOVE session for ${data.editor.getId()} to NEW EDITOR ${target.getId()}, ${session.agent.extensionId}`);
                this._onDidMoveSession.fire({ session, editor: target });
                break;
            }
        }
        if (!found) {
            throw new Error(`Cannot move session because it is not stored`);
        }
    }
    releaseSession(session) {
        this._releaseSession(session, false);
    }
    _releaseSession(session, byServer) {
        let tuple;
        // cleanup
        for (const candidate of this._sessions) {
            if (candidate[1].session === session) {
                // if (value.session === session) {
                tuple = candidate;
                break;
            }
        }
        if (!tuple) {
            // double remove
            return;
        }
        this._telemetryService.publicLog2('interactiveEditor/session', session.asTelemetryData());
        const [key, value] = tuple;
        this._sessions.delete(key);
        this._logService.trace(`[IE] did RELEASED session for ${value.editor.getId()}, ${session.agent.extensionId}`);
        this._onDidEndSession.fire({ editor: value.editor, session, endedByExternalCause: byServer });
        value.store.dispose();
    }
    stashSession(session, editor, undoCancelEdits) {
        const result = this._instaService.createInstance(StashedSession, editor, session, undoCancelEdits);
        this._onDidStashSession.fire({ editor, session });
        this._logService.trace(`[IE] did STASH session for ${editor.getId()}, ${session.agent.extensionId}`);
        return result;
    }
    getCodeEditor(session) {
        for (const [, data] of this._sessions) {
            if (data.session === session) {
                return data.editor;
            }
        }
        throw new Error('session not found');
    }
    getSession(editor, uri) {
        const key = this._key(editor, uri);
        return this._sessions.get(key)?.session;
    }
    _key(editor, uri) {
        const item = this._keyComputers.get(uri.scheme);
        return item
            ? item.getComparisonKey(editor, uri)
            : `${editor.getId()}@${uri.toString()}`;
    }
    registerSessionKeyComputer(scheme, value) {
        this._keyComputers.set(scheme, value);
        return toDisposable(() => this._keyComputers.delete(scheme));
    }
    async createSession2(editor, uri, token) {
        assertType(editor.hasModel());
        if (this._sessions2.has(uri)) {
            throw new Error('Session already exists');
        }
        this._onWillStartSession.fire(editor);
        const chatModel = this._chatService.startSession(ChatAgentLocation.EditingSession, token, false);
        const editingSession = await chatModel.editingSessionObs?.promise;
        const widget = this._chatWidgetService.getWidgetBySessionId(chatModel.sessionId);
        await widget?.attachmentModel.addFile(uri);
        const store = new DisposableStore();
        store.add(toDisposable(() => {
            this._chatService.cancelCurrentRequestForSession(chatModel.sessionId);
            editingSession.reject();
            this._sessions2.delete(uri);
            this._onDidChangeSessions.fire(this);
        }));
        store.add(chatModel);
        store.add(autorun(r => {
            const entries = editingSession.entries.read(r);
            if (entries.length === 0) {
                return;
            }
            const allSettled = entries.every(entry => {
                const state = entry.state.read(r);
                return (state === 1 /* WorkingSetEntryState.Accepted */ || state === 2 /* WorkingSetEntryState.Rejected */)
                    && !entry.isCurrentlyBeingModifiedBy.read(r);
            });
            if (allSettled && !chatModel.requestInProgress) {
                // self terminate
                store.dispose();
            }
        }));
        const result = {
            uri,
            initialPosition: editor.getPosition().delta(-1),
            chatModel,
            editingSession,
            dispose: store.dispose.bind(store)
        };
        this._sessions2.set(uri, result);
        this._onDidChangeSessions.fire(this);
        return result;
    }
    getSession2(uri) {
        let result = this._sessions2.get(uri);
        if (!result) {
            // no direct session, try to find an editing session which has a file entry for the uri
            for (const [_, candidate] of this._sessions2) {
                const entry = candidate.editingSession.getEntry(uri);
                if (entry) {
                    result = candidate;
                    break;
                }
            }
        }
        return result;
    }
};
InlineChatSessionServiceImpl = __decorate([
    __param(0, ITelemetryService),
    __param(1, IModelService),
    __param(2, ITextModelService),
    __param(3, IEditorWorkerService),
    __param(4, ILogService),
    __param(5, IInstantiationService),
    __param(6, IEditorService),
    __param(7, ITextFileService),
    __param(8, ILanguageService),
    __param(9, IChatService),
    __param(10, IChatAgentService),
    __param(11, IChatWidgetService)
], InlineChatSessionServiceImpl);
export { InlineChatSessionServiceImpl };
let InlineChatEnabler = class InlineChatEnabler {
    static { this.Id = 'inlineChat.enabler'; }
    constructor(contextKeyService, chatAgentService, editorService) {
        this._store = new DisposableStore();
        this._ctxHasProvider = CTX_INLINE_CHAT_HAS_AGENT.bindTo(contextKeyService);
        this._ctxHasProvider2 = CTX_INLINE_CHAT_HAS_AGENT2.bindTo(contextKeyService);
        this._ctxPossible = CTX_INLINE_CHAT_POSSIBLE.bindTo(contextKeyService);
        const updateAgent = () => {
            const agent = chatAgentService.getDefaultAgent(ChatAgentLocation.Editor);
            if (agent?.id === 'github.copilot.editor' || agent?.id === 'setup.editor') {
                this._ctxHasProvider.set(true);
                this._ctxHasProvider2.reset();
            }
            else if (agent?.id === 'github.copilot.editingSessionEditor') {
                this._ctxHasProvider.reset();
                this._ctxHasProvider2.set(true);
            }
            else {
                this._ctxHasProvider.reset();
                this._ctxHasProvider2.reset();
            }
        };
        this._store.add(chatAgentService.onDidChangeAgents(updateAgent));
        updateAgent();
        const updateEditor = () => {
            const ctrl = editorService.activeEditorPane?.getControl();
            const isCodeEditorLike = isCodeEditor(ctrl) || isDiffEditor(ctrl) || isCompositeEditor(ctrl);
            this._ctxPossible.set(isCodeEditorLike);
        };
        this._store.add(editorService.onDidActiveEditorChange(updateEditor));
        updateEditor();
    }
    dispose() {
        this._ctxPossible.reset();
        this._ctxHasProvider.reset();
        this._store.dispose();
    }
};
InlineChatEnabler = __decorate([
    __param(0, IContextKeyService),
    __param(1, IChatAgentService),
    __param(2, IEditorService)
], InlineChatEnabler);
export { InlineChatEnabler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdFNlc3Npb25TZXJ2aWNlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbmxpbmVDaGF0L2Jyb3dzZXIvaW5saW5lQ2hhdFNlc3Npb25TZXJ2aWNlSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFLQSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQWUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDckgsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUU5RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDL0QsT0FBTyxFQUFrQyxZQUFZLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUksT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRW5GLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFB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