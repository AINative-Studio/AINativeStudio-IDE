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
import { coalesce, compareBy, delta } from '../../../../../base/common/arrays.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ErrorNoTelemetry } from '../../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { Disposable, DisposableStore, dispose, toDisposable } from '../../../../../base/common/lifecycle.js';
import { LinkedList } from '../../../../../base/common/linkedList.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { derived, observableValueOpts, runOnChange, ValueWithChangeEventFromObservable } from '../../../../../base/common/observable.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { compare } from '../../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { assertType } from '../../../../../base/common/types.js';
import { TextEdit } from '../../../../../editor/common/languages.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IDecorationsService } from '../../../../services/decorations/common/decorations.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { IMultiDiffSourceResolverService, MultiDiffEditorItem } from '../../../multiDiffEditor/browser/multiDiffSourceResolverService.js';
import { CellUri } from '../../../notebook/common/notebookCommon.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME, chatEditingAgentSupportsReadonlyReferencesContextKey, chatEditingResourceContextKey, chatEditingSnapshotScheme, inChatEditingSessionContextKey } from '../../common/chatEditingService.js';
import { isCellTextEditOperation } from '../../common/chatModel.js';
import { IChatService } from '../../common/chatService.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { ChatEditorInput } from '../chatEditorInput.js';
import { AbstractChatEditingModifiedFileEntry } from './chatEditingModifiedFileEntry.js';
import { ChatEditingSession } from './chatEditingSession.js';
import { ChatEditingSnapshotTextModelContentProvider, ChatEditingTextModelContentProvider } from './chatEditingTextModelContentProviders.js';
let ChatEditingService = class ChatEditingService extends Disposable {
    constructor(_instantiationService, multiDiffSourceResolverService, textModelService, contextKeyService, _chatService, _editorService, decorationsService, _fileService, lifecycleService, storageService, logService, extensionService, productService, notebookService) {
        super();
        this._instantiationService = _instantiationService;
        this._chatService = _chatService;
        this._editorService = _editorService;
        this._fileService = _fileService;
        this.lifecycleService = lifecycleService;
        this.notebookService = notebookService;
        this._sessionsObs = observableValueOpts({ equalsFn: (a, b) => false }, new LinkedList());
        this.editingSessionsObs = derived(r => {
            const result = Array.from(this._sessionsObs.read(r));
            return result;
        });
        this._chatRelatedFilesProviders = new Map();
        this._register(decorationsService.registerDecorationsProvider(_instantiationService.createInstance(ChatDecorationsProvider, this.editingSessionsObs)));
        this._register(multiDiffSourceResolverService.registerResolver(_instantiationService.createInstance(ChatEditingMultiDiffSourceResolver, this.editingSessionsObs)));
        // TODO@jrieken
        // some ugly casting so that this service can pass itself as argument instad as service dependeny
        this._register(textModelService.registerTextModelContentProvider(ChatEditingTextModelContentProvider.scheme, _instantiationService.createInstance(ChatEditingTextModelContentProvider, this)));
        this._register(textModelService.registerTextModelContentProvider(chatEditingSnapshotScheme, _instantiationService.createInstance(ChatEditingSnapshotTextModelContentProvider, this)));
        this._register(this._chatService.onDidDisposeSession((e) => {
            if (e.reason === 'cleared') {
                this.getEditingSession(e.sessionId)?.stop();
            }
        }));
        // todo@connor4312: temporary until chatReadonlyPromptReference proposal is finalized
        const readonlyEnabledContextKey = chatEditingAgentSupportsReadonlyReferencesContextKey.bindTo(contextKeyService);
        const setReadonlyFilesEnabled = () => {
            const enabled = productService.quality !== 'stable' && extensionService.extensions.some(e => e.enabledApiProposals?.includes('chatReadonlyPromptReference'));
            readonlyEnabledContextKey.set(enabled);
        };
        setReadonlyFilesEnabled();
        this._register(extensionService.onDidRegisterExtensions(setReadonlyFilesEnabled));
        this._register(extensionService.onDidChangeExtensions(setReadonlyFilesEnabled));
        let storageTask;
        this._register(storageService.onWillSaveState(() => {
            const tasks = [];
            for (const session of this.editingSessionsObs.get()) {
                if (!session.isGlobalEditingSession) {
                    continue;
                }
                tasks.push(session.storeState());
            }
            storageTask = Promise.resolve(storageTask)
                .then(() => Promise.all(tasks))
                .finally(() => storageTask = undefined);
        }));
        this._register(this.lifecycleService.onWillShutdown(e => {
            if (!storageTask) {
                return;
            }
            e.join(storageTask, {
                id: 'join.chatEditingSession',
                label: localize('join.chatEditingSession', "Saving chat edits history")
            });
        }));
    }
    dispose() {
        dispose(this._sessionsObs.get());
        super.dispose();
    }
    async startOrContinueGlobalEditingSession(chatModel, waitForRestore = true) {
        if (waitForRestore) {
            await this._restoringEditingSession;
        }
        const session = this.getEditingSession(chatModel.sessionId);
        if (session) {
            return session;
        }
        const result = await this.createEditingSession(chatModel, true);
        return result;
    }
    _lookupEntry(uri) {
        for (const item of Iterable.concat(this.editingSessionsObs.get())) {
            const candidate = item.getEntry(uri);
            if (candidate instanceof AbstractChatEditingModifiedFileEntry) {
                // make sure to ref-count this object
                return candidate.acquire();
            }
        }
        return undefined;
    }
    getEditingSession(chatSessionId) {
        return this.editingSessionsObs.get()
            .find(candidate => candidate.chatSessionId === chatSessionId);
    }
    async createEditingSession(chatModel, global = false) {
        assertType(this.getEditingSession(chatModel.sessionId) === undefined, 'CANNOT have more than one editing session per chat session');
        const session = this._instantiationService.createInstance(ChatEditingSession, chatModel.sessionId, global, this._lookupEntry.bind(this));
        await session.init();
        const list = this._sessionsObs.get();
        const removeSession = list.unshift(session);
        const store = new DisposableStore();
        this._store.add(store);
        store.add(this.installAutoApplyObserver(session, chatModel));
        store.add(session.onDidDispose(e => {
            removeSession();
            this._sessionsObs.set(list, undefined);
            this._store.delete(store);
        }));
        this._sessionsObs.set(list, undefined);
        return session;
    }
    installAutoApplyObserver(session, chatModel) {
        if (!chatModel) {
            throw new ErrorNoTelemetry(`Edit session was created for a non-existing chat session: ${session.chatSessionId}`);
        }
        const observerDisposables = new DisposableStore();
        observerDisposables.add(chatModel.onDidChange(async (e) => {
            if (e.kind !== 'addRequest') {
                return;
            }
            session.createSnapshot(e.request.id, undefined);
            const responseModel = e.request.response;
            if (responseModel) {
                this.observerEditsInResponse(e.request.id, responseModel, session, observerDisposables);
            }
        }));
        observerDisposables.add(chatModel.onDidDispose(() => observerDisposables.dispose()));
        return observerDisposables;
    }
    observerEditsInResponse(requestId, responseModel, session, observerDisposables) {
        // Sparse array: the indicies are indexes of `responseModel.response.value`
        // that are edit groups, and then this tracks the edit application for
        // each of them. Note that text edit groups can be updated
        // multiple times during the process of response streaming.
        const editsSeen = [];
        const editedFilesExist = new ResourceMap();
        const ensureEditorOpen = (partUri) => {
            const uri = CellUri.parse(partUri)?.notebook ?? partUri;
            if (editedFilesExist.has(uri)) {
                return;
            }
            const fileExists = this.notebookService.getNotebookTextModel(uri) ? Promise.resolve(true) : this._fileService.exists(uri);
            editedFilesExist.set(uri, fileExists.then((e) => {
                if (!e) {
                    return;
                }
                const activeUri = this._editorService.activeEditorPane?.input.resource;
                const inactive = this._editorService.activeEditorPane?.input instanceof ChatEditorInput && this._editorService.activeEditorPane.input.sessionId === session.chatSessionId ||
                    Boolean(activeUri && session.entries.get().find(entry => isEqual(activeUri, entry.modifiedURI)));
                this._editorService.openEditor({ resource: uri, options: { inactive, preserveFocus: true, pinned: true } });
            }));
        };
        const onResponseComplete = () => {
            for (const remaining of editsSeen) {
                remaining?.streaming.complete();
            }
            if (responseModel.result?.errorDetails && !responseModel.result.errorDetails.responseIsIncomplete) {
                // Roll back everything
                session.restoreSnapshot(responseModel.requestId, undefined);
            }
            editsSeen.length = 0;
            editedFilesExist.clear();
        };
        const handleResponseParts = async () => {
            if (responseModel.isCanceled) {
                return;
            }
            let undoStop;
            for (let i = 0; i < responseModel.response.value.length; i++) {
                const part = responseModel.response.value[i];
                if (part.kind === 'undoStop') {
                    undoStop = part.id;
                    continue;
                }
                if (part.kind !== 'textEditGroup' && part.kind !== 'notebookEditGroup') {
                    continue;
                }
                ensureEditorOpen(part.uri);
                // get new edits and start editing session
                let entry = editsSeen[i];
                if (!entry) {
                    entry = { seen: 0, streaming: session.startStreamingEdits(CellUri.parse(part.uri)?.notebook ?? part.uri, responseModel, undoStop) };
                    editsSeen[i] = entry;
                }
                const isFirst = entry.seen === 0;
                const newEdits = part.edits.slice(entry.seen).flat();
                entry.seen = part.edits.length;
                if (newEdits.length > 0 || isFirst) {
                    if (part.kind === 'notebookEditGroup') {
                        newEdits.forEach(edit => {
                            if (TextEdit.isTextEdit(edit)) {
                                // Not possible, as Notebooks would have a different type.
                                return;
                            }
                            else if (isCellTextEditOperation(edit)) {
                                entry.streaming.pushNotebookCellText(edit.uri, [edit.edit]);
                            }
                            else {
                                entry.streaming.pushNotebook([edit]);
                            }
                        });
                    }
                    else if (part.kind === 'textEditGroup') {
                        entry.streaming.pushText(newEdits);
                    }
                }
                if (part.done) {
                    entry.streaming.complete();
                }
            }
        };
        if (responseModel.isComplete) {
            handleResponseParts().then(() => {
                onResponseComplete();
            });
        }
        else {
            const disposable = observerDisposables.add(responseModel.onDidChange(e2 => {
                if (e2.reason === 'undoStop') {
                    session.createSnapshot(requestId, e2.id);
                }
                else {
                    handleResponseParts().then(() => {
                        if (responseModel.isComplete) {
                            onResponseComplete();
                            observerDisposables.delete(disposable);
                        }
                    });
                }
            }));
        }
    }
    hasRelatedFilesProviders() {
        return this._chatRelatedFilesProviders.size > 0;
    }
    registerRelatedFilesProvider(handle, provider) {
        this._chatRelatedFilesProviders.set(handle, provider);
        return toDisposable(() => {
            this._chatRelatedFilesProviders.delete(handle);
        });
    }
    async getRelatedFiles(chatSessionId, prompt, files, token) {
        const providers = Array.from(this._chatRelatedFilesProviders.values());
        const result = await Promise.all(providers.map(async (provider) => {
            try {
                const relatedFiles = await provider.provideRelatedFiles({ prompt, files }, token);
                if (relatedFiles?.length) {
                    return { group: provider.description, files: relatedFiles };
                }
                return undefined;
            }
            catch (e) {
                return undefined;
            }
        }));
        return coalesce(result);
    }
};
ChatEditingService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IMultiDiffSourceResolverService),
    __param(2, ITextModelService),
    __param(3, IContextKeyService),
    __param(4, IChatService),
    __param(5, IEditorService),
    __param(6, IDecorationsService),
    __param(7, IFileService),
    __param(8, ILifecycleService),
    __param(9, IStorageService),
    __param(10, ILogService),
    __param(11, IExtensionService),
    __param(12, IProductService),
    __param(13, INotebookService)
], ChatEditingService);
export { ChatEditingService };
/**
 * Emits an event containing the added or removed elements of the observable.
 */
function observeArrayChanges(obs, compare, store) {
    const emitter = store.add(new Emitter());
    store.add(runOnChange(obs, (newArr, oldArr) => {
        const change = delta(oldArr || [], newArr, compare);
        const changedElements = [].concat(change.added).concat(change.removed);
        emitter.fire(changedElements);
    }));
    return emitter.event;
}
let ChatDecorationsProvider = class ChatDecorationsProvider extends Disposable {
    constructor(_sessions, _chatAgentService) {
        super();
        this._sessions = _sessions;
        this._chatAgentService = _chatAgentService;
        this.label = localize('chat', "Chat Editing");
        this._currentEntries = derived(this, (r) => {
            const sessions = this._sessions.read(r);
            if (!sessions) {
                return [];
            }
            const result = [];
            for (const session of sessions) {
                if (session.state.read(r) !== 3 /* ChatEditingSessionState.Disposed */) {
                    const entries = session.entries.read(r);
                    result.push(...entries);
                }
            }
            return result;
        });
        this._currentlyEditingUris = derived(this, (r) => {
            const uri = this._currentEntries.read(r);
            return uri.filter(entry => entry.isCurrentlyBeingModifiedBy.read(r)).map(entry => entry.modifiedURI);
        });
        this._modifiedUris = derived(this, (r) => {
            const uri = this._currentEntries.read(r);
            return uri.filter(entry => !entry.isCurrentlyBeingModifiedBy.read(r) && entry.state.read(r) === 0 /* WorkingSetEntryState.Modified */).map(entry => entry.modifiedURI);
        });
        this.onDidChange = Event.any(observeArrayChanges(this._currentlyEditingUris, compareBy(uri => uri.toString(), compare), this._store), observeArrayChanges(this._modifiedUris, compareBy(uri => uri.toString(), compare), this._store));
    }
    provideDecorations(uri, _token) {
        const isCurrentlyBeingModified = this._currentlyEditingUris.get().some(e => e.toString() === uri.toString());
        if (isCurrentlyBeingModified) {
            return {
                weight: 1000,
                letter: ThemeIcon.modify(Codicon.loading, 'spin'),
                bubble: false
            };
        }
        const isModified = this._modifiedUris.get().some(e => e.toString() === uri.toString());
        if (isModified) {
            const defaultAgentName = this._chatAgentService.getDefaultAgent(ChatAgentLocation.EditingSession)?.fullName;
            return {
                weight: 1000,
                letter: Codicon.diffModified,
                tooltip: defaultAgentName ? localize('chatEditing.modified', "Pending changes from {0}", defaultAgentName) : localize('chatEditing.modified2', "Pending changes from chat"),
                bubble: true
            };
        }
        return undefined;
    }
};
ChatDecorationsProvider = __decorate([
    __param(1, IChatAgentService)
], ChatDecorationsProvider);
let ChatEditingMultiDiffSourceResolver = class ChatEditingMultiDiffSourceResolver {
    constructor(_editingSessionsObs, _instantiationService) {
        this._editingSessionsObs = _editingSessionsObs;
        this._instantiationService = _instantiationService;
    }
    canHandleUri(uri) {
        return uri.scheme === CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME;
    }
    async resolveDiffSource(uri) {
        const thisSession = derived(this, r => {
            return this._editingSessionsObs.read(r).find(candidate => candidate.chatSessionId === uri.authority);
        });
        return this._instantiationService.createInstance(ChatEditingMultiDiffSource, thisSession);
    }
};
ChatEditingMultiDiffSourceResolver = __decorate([
    __param(1, IInstantiationService)
], ChatEditingMultiDiffSourceResolver);
export { ChatEditingMultiDiffSourceResolver };
class ChatEditingMultiDiffSource {
    constructor(_currentSession) {
        this._currentSession = _currentSession;
        this._resources = derived(this, (reader) => {
            const currentSession = this._currentSession.read(reader);
            if (!currentSession) {
                return [];
            }
            const entries = currentSession.entries.read(reader);
            return entries.map((entry) => {
                return new MultiDiffEditorItem(entry.originalURI, entry.modifiedURI, undefined, {
                    [chatEditingResourceContextKey.key]: entry.entryId,
                    // [inChatEditingSessionContextKey.key]: true
                });
            });
        });
        this.resources = new ValueWithChangeEventFromObservable(this._resources);
        this.contextKeys = {
            [inChatEditingSessionContextKey.key]: true
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdTZXJ2aWNlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRpbmcvY2hhdEVkaXRpbmdTZXJ2aWNlSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVsRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDeEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBZSxtQkFBbUIsRUFBRSxXQUFXLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN0SixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1B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