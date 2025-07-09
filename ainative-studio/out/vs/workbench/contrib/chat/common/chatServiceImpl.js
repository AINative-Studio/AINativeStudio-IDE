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
import { DeferredPromise } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { memoize } from '../../../../base/common/decorators.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { ErrorNoTelemetry } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, DisposableMap } from '../../../../base/common/lifecycle.js';
import { revive } from '../../../../base/common/marshalling.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { URI } from '../../../../base/common/uri.js';
import { isLocation } from '../../../../editor/common/languages.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IWorkbenchAssignmentService } from '../../../services/assignment/common/assignmentService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IChatAgentService } from './chatAgents.js';
import { ChatModel, ChatRequestModel, normalizeSerializableChatData, toChatHistoryContent, updateRanges } from './chatModel.js';
import { ChatRequestAgentPart, ChatRequestAgentSubcommandPart, ChatRequestSlashCommandPart, chatAgentLeader, chatSubcommandLeader, getPromptText } from './chatParserTypes.js';
import { ChatRequestParser } from './chatRequestParser.js';
import { ChatServiceTelemetry } from './chatServiceTelemetry.js';
import { ChatSessionStore } from './chatSessionStore.js';
import { IChatSlashCommandService } from './chatSlashCommands.js';
import { IChatVariablesService } from './chatVariables.js';
import { ChatAgentLocation, ChatConfiguration, ChatMode } from './constants.js';
import { ILanguageModelToolsService } from './languageModelToolsService.js';
const serializedChatKey = 'interactive.sessions';
const globalChatKey = 'chat.workspaceTransfer';
const SESSION_TRANSFER_EXPIRATION_IN_MILLISECONDS = 1000 * 60;
const maxPersistedSessions = 25;
let CancellableRequest = class CancellableRequest {
    constructor(cancellationTokenSource, requestId, toolsService) {
        this.cancellationTokenSource = cancellationTokenSource;
        this.requestId = requestId;
        this.toolsService = toolsService;
    }
    dispose() {
        this.cancellationTokenSource.dispose();
    }
    cancel() {
        if (this.requestId) {
            this.toolsService.cancelToolCallsForRequest(this.requestId);
        }
        this.cancellationTokenSource.cancel();
    }
};
CancellableRequest = __decorate([
    __param(2, ILanguageModelToolsService)
], CancellableRequest);
let ChatService = class ChatService extends Disposable {
    get transferredSessionData() {
        return this._transferredSessionData;
    }
    get unifiedViewEnabled() {
        return !!this.configurationService.getValue(ChatConfiguration.UnifiedChatView);
    }
    get useFileStorage() {
        return this.configurationService.getValue(ChatConfiguration.UseFileStorage);
    }
    get isEmptyWindow() {
        const workspace = this.workspaceContextService.getWorkspace();
        return !workspace.configuration && workspace.folders.length === 0;
    }
    constructor(storageService, logService, extensionService, instantiationService, telemetryService, workspaceContextService, chatSlashCommandService, chatVariablesService, chatAgentService, configurationService, experimentService) {
        super();
        this.storageService = storageService;
        this.logService = logService;
        this.extensionService = extensionService;
        this.instantiationService = instantiationService;
        this.telemetryService = telemetryService;
        this.workspaceContextService = workspaceContextService;
        this.chatSlashCommandService = chatSlashCommandService;
        this.chatVariablesService = chatVariablesService;
        this.chatAgentService = chatAgentService;
        this.configurationService = configurationService;
        this.experimentService = experimentService;
        this._sessionModels = this._register(new DisposableMap());
        this._pendingRequests = this._register(new DisposableMap());
        /** Just for empty windows, need to enforce that a chat was deleted, even though other windows still have it */
        this._deletedChatIds = new Set();
        this._onDidSubmitRequest = this._register(new Emitter());
        this.onDidSubmitRequest = this._onDidSubmitRequest.event;
        this._onDidPerformUserAction = this._register(new Emitter());
        this.onDidPerformUserAction = this._onDidPerformUserAction.event;
        this._onDidDisposeSession = this._register(new Emitter());
        this.onDidDisposeSession = this._onDidDisposeSession.event;
        this._sessionFollowupCancelTokens = this._register(new DisposableMap());
        this._chatServiceTelemetry = this.instantiationService.createInstance(ChatServiceTelemetry);
        const sessionData = storageService.get(serializedChatKey, this.isEmptyWindow ? -1 /* StorageScope.APPLICATION */ : 1 /* StorageScope.WORKSPACE */, '');
        if (sessionData) {
            this._persistedSessions = this.deserializeChats(sessionData);
            const countsForLog = Object.keys(this._persistedSessions).length;
            if (countsForLog > 0) {
                this.trace('constructor', `Restored ${countsForLog} persisted sessions`);
            }
        }
        else {
            this._persistedSessions = {};
        }
        const transferredData = this.getTransferredSessionData();
        const transferredChat = transferredData?.chat;
        if (transferredChat) {
            this.trace('constructor', `Transferred session ${transferredChat.sessionId}`);
            this._persistedSessions[transferredChat.sessionId] = transferredChat;
            this._transferredSessionData = {
                sessionId: transferredChat.sessionId,
                inputValue: transferredData.inputValue,
                location: transferredData.location,
                mode: transferredData.mode,
            };
        }
        this._chatSessionStore = this._register(this.instantiationService.createInstance(ChatSessionStore));
        if (this.useFileStorage) {
            this._chatSessionStore.migrateDataIfNeeded(() => this._persistedSessions);
        }
        this._register(storageService.onWillSaveState(() => this.saveState()));
    }
    isEnabled(location) {
        return this.chatAgentService.getContributedDefaultAgent(location) !== undefined;
    }
    saveState() {
        const liveChats = Array.from(this._sessionModels.values())
            .filter(session => session.initialLocation === ChatAgentLocation.Panel || session.initialLocation === ChatAgentLocation.EditingSession);
        if (this.useFileStorage) {
            this._chatSessionStore.storeSessions(liveChats);
        }
        else {
            if (this.isEmptyWindow) {
                this.syncEmptyWindowChats(liveChats);
            }
            else {
                let allSessions = liveChats;
                allSessions = allSessions.concat(Object.values(this._persistedSessions)
                    .filter(session => !this._sessionModels.has(session.sessionId))
                    .filter(session => session.requests.length));
                allSessions.sort((a, b) => (b.creationDate ?? 0) - (a.creationDate ?? 0));
                // Only keep one persisted edit session, the latest one. This would be the current one if it's live.
                // No way to know whether it's currently live or if it has been cleared and there is no current session.
                // But ensure that we don't store multiple edit sessions.
                let hasPersistedEditSession = false;
                allSessions = allSessions.filter(s => {
                    if (s.initialLocation === ChatAgentLocation.EditingSession) {
                        if (hasPersistedEditSession) {
                            return false;
                        }
                        else {
                            hasPersistedEditSession = true;
                            return true;
                        }
                    }
                    return true;
                });
                allSessions = allSessions.slice(0, maxPersistedSessions);
                if (allSessions.length) {
                    this.trace('onWillSaveState', `Persisting ${allSessions.length} sessions`);
                }
                const serialized = JSON.stringify(allSessions);
                if (allSessions.length) {
                    this.trace('onWillSaveState', `Persisting ${serialized.length} chars`);
                }
                this.storageService.store(serializedChatKey, serialized, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
            }
        }
        this._deletedChatIds.clear();
    }
    syncEmptyWindowChats(thisWindowChats) {
        // Note- an unavoidable race condition exists here. If there are multiple empty windows open, and the user quits the application, then the focused
        // window may lose active chats, because all windows are reading and writing to storageService at the same time. This can't be fixed without some
        // kind of locking, but in reality, the focused window will likely have run `saveState` at some point, like on a window focus change, and it will
        // generally be fine.
        const sessionData = this.storageService.get(serializedChatKey, -1 /* StorageScope.APPLICATION */, '');
        const originalPersistedSessions = this._persistedSessions;
        let persistedSessions;
        if (sessionData) {
            persistedSessions = this.deserializeChats(sessionData);
            const countsForLog = Object.keys(persistedSessions).length;
            if (countsForLog > 0) {
                this.trace('constructor', `Restored ${countsForLog} persisted sessions`);
            }
        }
        else {
            persistedSessions = {};
        }
        this._deletedChatIds.forEach(id => delete persistedSessions[id]);
        // Has the chat in this window been updated, and then closed? Overwrite the old persisted chats.
        Object.values(originalPersistedSessions).forEach(session => {
            const persistedSession = persistedSessions[session.sessionId];
            if (persistedSession && session.requests.length > persistedSession.requests.length) {
                // We will add a 'modified date' at some point, but comparing the number of requests is good enough
                persistedSessions[session.sessionId] = session;
            }
            else if (!persistedSession && session.isNew) {
                // This session was created in this window, and hasn't been persisted yet
                session.isNew = false;
                persistedSessions[session.sessionId] = session;
            }
        });
        this._persistedSessions = persistedSessions;
        // Add this window's active chat models to the set to persist.
        // Having the same session open in two empty windows at the same time can lead to data loss, this is acceptable
        const allSessions = { ...this._persistedSessions };
        for (const chat of thisWindowChats) {
            allSessions[chat.sessionId] = chat;
        }
        let sessionsList = Object.values(allSessions);
        sessionsList.sort((a, b) => (b.creationDate ?? 0) - (a.creationDate ?? 0));
        sessionsList = sessionsList.slice(0, maxPersistedSessions);
        const data = JSON.stringify(sessionsList);
        this.storageService.store(serializedChatKey, data, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    notifyUserAction(action) {
        this._chatServiceTelemetry.notifyUserAction(action);
        this._onDidPerformUserAction.fire(action);
    }
    async setChatSessionTitle(sessionId, title) {
        const model = this._sessionModels.get(sessionId);
        if (model) {
            model.setCustomTitle(title);
            return;
        }
        if (this.useFileStorage) {
            await this._chatSessionStore.setSessionTitle(sessionId, title);
            return;
        }
        const session = this._persistedSessions[sessionId];
        if (session) {
            session.customTitle = title;
        }
    }
    trace(method, message) {
        if (message) {
            this.logService.trace(`ChatService#${method}: ${message}`);
        }
        else {
            this.logService.trace(`ChatService#${method}`);
        }
    }
    error(method, message) {
        this.logService.error(`ChatService#${method} ${message}`);
    }
    deserializeChats(sessionData) {
        try {
            const arrayOfSessions = revive(JSON.parse(sessionData)); // Revive serialized URIs in session data
            if (!Array.isArray(arrayOfSessions)) {
                throw new Error('Expected array');
            }
            const sessions = arrayOfSessions.reduce((acc, session) => {
                // Revive serialized markdown strings in response data
                for (const request of session.requests) {
                    if (Array.isArray(request.response)) {
                        request.response = request.response.map((response) => {
                            if (typeof response === 'string') {
                                return new MarkdownString(response);
                            }
                            return response;
                        });
                    }
                    else if (typeof request.response === 'string') {
                        request.response = [new MarkdownString(request.response)];
                    }
                }
                acc[session.sessionId] = normalizeSerializableChatData(session);
                return acc;
            }, {});
            return sessions;
        }
        catch (err) {
            this.error('deserializeChats', `Malformed session data: ${err}. [${sessionData.substring(0, 20)}${sessionData.length > 20 ? '...' : ''}]`);
            return {};
        }
    }
    getTransferredSessionData() {
        const data = this.storageService.getObject(globalChatKey, 0 /* StorageScope.PROFILE */, []);
        const workspaceUri = this.workspaceContextService.getWorkspace().folders[0]?.uri;
        if (!workspaceUri) {
            return;
        }
        const thisWorkspace = workspaceUri.toString();
        const currentTime = Date.now();
        // Only use transferred data if it was created recently
        const transferred = data.find(item => URI.revive(item.toWorkspace).toString() === thisWorkspace && (currentTime - item.timestampInMilliseconds < SESSION_TRANSFER_EXPIRATION_IN_MILLISECONDS));
        // Keep data that isn't for the current workspace and that hasn't expired yet
        const filtered = data.filter(item => URI.revive(item.toWorkspace).toString() !== thisWorkspace && (currentTime - item.timestampInMilliseconds < SESSION_TRANSFER_EXPIRATION_IN_MILLISECONDS));
        this.storageService.store(globalChatKey, JSON.stringify(filtered), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        return transferred;
    }
    /**
     * Returns an array of chat details for all persisted chat sessions that have at least one request.
     * Chat sessions that have already been loaded into the chat view are excluded from the result.
     * Imported chat sessions are also excluded from the result.
     */
    async getHistory() {
        if (this.useFileStorage) {
            const liveSessionItems = Array.from(this._sessionModels.values())
                .filter(session => !session.isImported && (session.initialLocation !== ChatAgentLocation.EditingSession || this.unifiedViewEnabled))
                .map(session => {
                const title = session.title || localize('newChat', "New Chat");
                return {
                    sessionId: session.sessionId,
                    title,
                    lastMessageDate: session.lastMessageDate,
                    isActive: true,
                };
            });
            const index = await this._chatSessionStore.getIndex();
            const entries = Object.values(index)
                .filter(entry => !this._sessionModels.has(entry.sessionId) && !entry.isImported && !entry.isEmpty)
                .map((entry) => ({
                ...entry,
                isActive: this._sessionModels.has(entry.sessionId),
            }));
            return [...liveSessionItems, ...entries];
        }
        const persistedSessions = Object.values(this._persistedSessions)
            .filter(session => session.requests.length > 0)
            .filter(session => !this._sessionModels.has(session.sessionId));
        const persistedSessionItems = persistedSessions
            .filter(session => !session.isImported && session.initialLocation !== ChatAgentLocation.EditingSession)
            .map(session => {
            const title = session.customTitle ?? ChatModel.getDefaultTitle(session.requests);
            return {
                sessionId: session.sessionId,
                title,
                lastMessageDate: session.lastMessageDate,
                isActive: false,
            };
        });
        const liveSessionItems = Array.from(this._sessionModels.values())
            .filter(session => !session.isImported && session.initialLocation !== ChatAgentLocation.EditingSession)
            .map(session => {
            const title = session.title || localize('newChat', "New Chat");
            return {
                sessionId: session.sessionId,
                title,
                lastMessageDate: session.lastMessageDate,
                isActive: true,
            };
        });
        return [...liveSessionItems, ...persistedSessionItems];
    }
    async removeHistoryEntry(sessionId) {
        if (this.useFileStorage) {
            await this._chatSessionStore.deleteSession(sessionId);
            return;
        }
        if (this._persistedSessions[sessionId]) {
            this._deletedChatIds.add(sessionId);
            delete this._persistedSessions[sessionId];
            this.saveState();
        }
    }
    async clearAllHistoryEntries() {
        if (this.useFileStorage) {
            await this._chatSessionStore.clearAllSessions();
            return;
        }
        Object.values(this._persistedSessions).forEach(session => this._deletedChatIds.add(session.sessionId));
        this._persistedSessions = {};
        this.saveState();
    }
    startSession(location, token, isGlobalEditingSession = true) {
        this.trace('startSession');
        return this._startSession(undefined, location, isGlobalEditingSession, token);
    }
    _startSession(someSessionHistory, location, isGlobalEditingSession, token) {
        const model = this.instantiationService.createInstance(ChatModel, someSessionHistory, location);
        if (location === ChatAgentLocation.EditingSession || (this.unifiedViewEnabled && location === ChatAgentLocation.Panel)) {
            model.startEditingSession(isGlobalEditingSession);
        }
        this._sessionModels.set(model.sessionId, model);
        this.initializeSession(model, token);
        return model;
    }
    async initializeSession(model, token) {
        try {
            this.trace('initializeSession', `Initialize session ${model.sessionId}`);
            model.startInitialize();
            await this.extensionService.whenInstalledExtensionsRegistered();
            const defaultAgentData = this.chatAgentService.getContributedDefaultAgent(model.initialLocation) ?? this.chatAgentService.getContributedDefaultAgent(ChatAgentLocation.Panel);
            if (!defaultAgentData) {
                throw new ErrorNoTelemetry('No default agent contributed');
            }
            if (this.configurationService.getValue('chat.setupFromDialog')) {
                // Activate the default extension provided agent but do not wait
                // for it to be ready so that the session can be used immediately
                // without having to wait for the agent to be ready.
                this.extensionService.activateByEvent(`onChatParticipant:${defaultAgentData.id}`);
            }
            else {
                // No setup participant to fall back on- wait for extension activation
                await this.extensionService.activateByEvent(`onChatParticipant:${defaultAgentData.id}`);
                const defaultAgent = this.chatAgentService.getActivatedAgents().find(agent => agent.id === defaultAgentData.id);
                if (!defaultAgent) {
                    throw new ErrorNoTelemetry('No default agent registered');
                }
            }
            model.initialize();
        }
        catch (err) {
            this.trace('startSession', `initializeSession failed: ${err}`);
            model.setInitializationError(err);
            this._sessionModels.deleteAndDispose(model.sessionId);
            this._onDidDisposeSession.fire({ sessionId: model.sessionId, reason: 'initializationFailed' });
        }
    }
    getSession(sessionId) {
        return this._sessionModels.get(sessionId);
    }
    async getOrRestoreSession(sessionId) {
        this.trace('getOrRestoreSession', `sessionId: ${sessionId}`);
        const model = this._sessionModels.get(sessionId);
        if (model) {
            return model;
        }
        let sessionData;
        if (this.useFileStorage) {
            sessionData = revive(await this._chatSessionStore.readSession(sessionId));
        }
        else {
            sessionData = revive(this._persistedSessions[sessionId]);
        }
        if (!sessionData) {
            return undefined;
        }
        const session = this._startSession(sessionData, sessionData.initialLocation ?? ChatAgentLocation.Panel, true, CancellationToken.None);
        const isTransferred = this.transferredSessionData?.sessionId === sessionId;
        if (isTransferred) {
            // TODO
            // this.chatAgentService.toggleToolsAgentMode(this.transferredSessionData.toolsAgentModeEnabled);
            this._transferredSessionData = undefined;
        }
        return session;
    }
    /**
     * This is really just for migrating data from the edit session location to the panel.
     */
    isPersistedSessionEmpty(sessionId) {
        const session = this._persistedSessions[sessionId];
        if (session) {
            return session.requests.length === 0;
        }
        return this._chatSessionStore.isSessionEmpty(sessionId);
    }
    loadSessionFromContent(data) {
        return this._startSession(data, data.initialLocation ?? ChatAgentLocation.Panel, true, CancellationToken.None);
    }
    async resendRequest(request, options) {
        const model = this._sessionModels.get(request.session.sessionId);
        if (!model && model !== request.session) {
            throw new Error(`Unknown session: ${request.session.sessionId}`);
        }
        await model.waitForInitialization();
        const cts = this._pendingRequests.get(request.session.sessionId);
        if (cts) {
            this.trace('resendRequest', `Session ${request.session.sessionId} already has a pending request, cancelling...`);
            cts.cancel();
        }
        const location = options?.location ?? model.initialLocation;
        const attempt = options?.attempt ?? 0;
        const enableCommandDetection = !options?.noCommandDetection;
        const defaultAgent = this.chatAgentService.getDefaultAgent(location, options?.mode);
        model.removeRequest(request.id, 1 /* ChatRequestRemovalReason.Resend */);
        const resendOptions = {
            ...options,
            locationData: request.locationData,
            attachedContext: request.attachedContext,
            hasInstructionAttachments: options?.hasInstructionAttachments ?? false,
        };
        await this._sendRequestAsync(model, model.sessionId, request.message, attempt, enableCommandDetection, defaultAgent, location, resendOptions).responseCompletePromise;
    }
    async sendRequest(sessionId, request, options) {
        this.trace('sendRequest', `sessionId: ${sessionId}, message: ${request.substring(0, 20)}${request.length > 20 ? '[...]' : ''}}`);
        // if text is not provided, but chat input has `prompt instructions`
        // attached, use the default prompt text to avoid empty messages
        if (!request.trim() && options?.hasInstructionAttachments) {
            request = 'Follow these instructions.';
        }
        if (!request.trim() && !options?.slashCommand && !options?.agentId && !options?.hasInstructionAttachments) {
            this.trace('sendRequest', 'Rejected empty message');
            return;
        }
        const model = this._sessionModels.get(sessionId);
        if (!model) {
            throw new Error(`Unknown session: ${sessionId}`);
        }
        await model.waitForInitialization();
        if (this._pendingRequests.has(sessionId)) {
            this.trace('sendRequest', `Session ${sessionId} already has a pending request`);
            return;
        }
        const requests = model.getRequests();
        for (let i = requests.length - 1; i >= 0; i -= 1) {
            const request = requests[i];
            if (request.shouldBeRemovedOnSend) {
                if (request.shouldBeRemovedOnSend.afterUndoStop) {
                    request.response?.finalizeUndoState();
                }
                else {
                    this.removeRequest(sessionId, request.id);
                }
            }
        }
        const location = options?.location ?? model.initialLocation;
        const attempt = options?.attempt ?? 0;
        const defaultAgent = this.chatAgentService.getDefaultAgent(location, options?.mode);
        const parsedRequest = this.parseChatRequest(sessionId, request, location, options);
        const agent = parsedRequest.parts.find((r) => r instanceof ChatRequestAgentPart)?.agent ?? defaultAgent;
        const agentSlashCommandPart = parsedRequest.parts.find((r) => r instanceof ChatRequestAgentSubcommandPart);
        // This method is only returning whether the request was accepted - don't block on the actual request
        return {
            ...this._sendRequestAsync(model, sessionId, parsedRequest, attempt, !options?.noCommandDetection, defaultAgent, location, options),
            agent,
            slashCommand: agentSlashCommandPart?.command,
        };
    }
    parseChatRequest(sessionId, request, location, options) {
        let parserContext = options?.parserContext;
        if (options?.agentId) {
            const agent = this.chatAgentService.getAgent(options.agentId);
            if (!agent) {
                throw new Error(`Unknown agent: ${options.agentId}`);
            }
            parserContext = { selectedAgent: agent, mode: options.mode };
            const commandPart = options.slashCommand ? ` ${chatSubcommandLeader}${options.slashCommand}` : '';
            request = `${chatAgentLeader}${agent.name}${commandPart} ${request}`;
        }
        const parsedRequest = this.instantiationService.createInstance(ChatRequestParser).parseChatRequest(sessionId, request, location, parserContext);
        return parsedRequest;
    }
    refreshFollowupsCancellationToken(sessionId) {
        this._sessionFollowupCancelTokens.get(sessionId)?.cancel();
        const newTokenSource = new CancellationTokenSource();
        this._sessionFollowupCancelTokens.set(sessionId, newTokenSource);
        return newTokenSource.token;
    }
    _sendRequestAsync(model, sessionId, parsedRequest, attempt, enableCommandDetection, defaultAgent, location, options) {
        const followupsCancelToken = this.refreshFollowupsCancellationToken(sessionId);
        let request;
        const agentPart = 'kind' in parsedRequest ? undefined : parsedRequest.parts.find((r) => r instanceof ChatRequestAgentPart);
        const agentSlashCommandPart = 'kind' in parsedRequest ? undefined : parsedRequest.parts.find((r) => r instanceof ChatRequestAgentSubcommandPart);
        const commandPart = 'kind' in parsedRequest ? undefined : parsedRequest.parts.find((r) => r instanceof ChatRequestSlashCommandPart);
        const requests = [...model.getRequests()];
        let gotProgress = false;
        const requestType = commandPart ? 'slashCommand' : 'string';
        const responseCreated = new DeferredPromise();
        let responseCreatedComplete = false;
        function completeResponseCreated() {
            if (!responseCreatedComplete && request?.response) {
                responseCreated.complete(request.response);
                responseCreatedComplete = true;
            }
        }
        const source = new CancellationTokenSource();
        const token = source.token;
        const sendRequestInternal = async () => {
            const progressCallback = (progress) => {
                if (token.isCancellationRequested) {
                    return;
                }
                gotProgress = true;
                if (progress.kind === 'markdownContent') {
                    this.trace('sendRequest', `Provider returned progress for session ${model.sessionId}, ${progress.content.value.length} chars`);
                }
                else {
                    this.trace('sendRequest', `Provider returned progress: ${JSON.stringify(progress)}`);
                }
                model.acceptResponseProgress(request, progress);
                completeResponseCreated();
            };
            let detectedAgent;
            let detectedCommand;
            const stopWatch = new StopWatch(false);
            const listener = token.onCancellationRequested(() => {
                this.trace('sendRequest', `Request for session ${model.sessionId} was cancelled`);
                this.telemetryService.publicLog2('interactiveSessionProviderInvoked', {
                    timeToFirstProgress: undefined,
                    // Normally timings happen inside the EH around the actual provider. For cancellation we can measure how long the user waited before cancelling
                    totalTime: stopWatch.elapsed(),
                    result: 'cancelled',
                    requestType,
                    agent: detectedAgent?.id ?? agentPart?.agent.id ?? '',
                    agentExtensionId: detectedAgent?.extensionId.value ?? agentPart?.agent.extensionId.value ?? '',
                    slashCommand: agentSlashCommandPart ? agentSlashCommandPart.command.name : commandPart?.slashCommand.command,
                    chatSessionId: model.sessionId,
                    location,
                    citations: request?.response?.codeCitations.length ?? 0,
                    numCodeBlocks: getCodeBlocks(request.response?.response.toString() ?? '').length,
                    isParticipantDetected: !!detectedAgent,
                    enableCommandDetection,
                    attachmentKinds: this.attachmentKindsForTelemetry(request.variableData)
                });
                model.cancelRequest(request);
            });
            try {
                let rawResult;
                let agentOrCommandFollowups = undefined;
                let chatTitlePromise;
                if (agentPart || (defaultAgent && !commandPart)) {
                    const prepareChatAgentRequest = async (agent, command, enableCommandDetection, chatRequest, isParticipantDetected) => {
                        const initVariableData = { variables: [] };
                        request = chatRequest ?? model.addRequest(parsedRequest, initVariableData, attempt, agent, command, options?.confirmation, options?.locationData, options?.attachedContext, undefined, options?.userSelectedModelId);
                        let variableData;
                        let message;
                        if (chatRequest) {
                            variableData = chatRequest.variableData;
                            message = getPromptText(request.message).message;
                        }
                        else {
                            variableData = this.chatVariablesService.resolveVariables(parsedRequest, request.attachedContext);
                            model.updateRequest(request, variableData);
                            const promptTextResult = getPromptText(request.message);
                            variableData = updateRanges(variableData, promptTextResult.diff); // TODO bit of a hack
                            message = promptTextResult.message;
                        }
                        return {
                            sessionId,
                            requestId: request.id,
                            agentId: agent.id,
                            message,
                            command: command?.name,
                            variables: variableData,
                            enableCommandDetection,
                            isParticipantDetected,
                            attempt,
                            location,
                            locationData: request.locationData,
                            acceptedConfirmationData: options?.acceptedConfirmationData,
                            rejectedConfirmationData: options?.rejectedConfirmationData,
                            userSelectedModelId: options?.userSelectedModelId,
                            userSelectedTools: options?.userSelectedTools
                        };
                    };
                    if (this.configurationService.getValue('chat.detectParticipant.enabled') !== false && this.chatAgentService.hasChatParticipantDetectionProviders() && !agentPart && !commandPart && !agentSlashCommandPart && enableCommandDetection && options?.mode !== ChatMode.Agent && options?.mode !== ChatMode.Edit) {
                        // We have no agent or command to scope history with, pass the full history to the participant detection provider
                        const defaultAgentHistory = this.getHistoryEntriesFromModel(requests, model.sessionId, location, defaultAgent.id);
                        // Prepare the request object that we will send to the participant detection provider
                        const chatAgentRequest = await prepareChatAgentRequest(defaultAgent, undefined, enableCommandDetection, undefined, false);
                        const result = await this.chatAgentService.detectAgentOrCommand(chatAgentRequest, defaultAgentHistory, { location }, token);
                        if (result && this.chatAgentService.getAgent(result.agent.id)?.locations?.includes(location)) {
                            // Update the response in the ChatModel to reflect the detected agent and command
                            request.response?.setAgent(result.agent, result.command);
                            detectedAgent = result.agent;
                            detectedCommand = result.command;
                        }
                    }
                    const agent = (detectedAgent ?? agentPart?.agent ?? defaultAgent);
                    const command = detectedCommand ?? agentSlashCommandPart?.command;
                    await this.extensionService.activateByEvent(`onChatParticipant:${agent.id}`);
                    await this.checkAgentAllowed(agent);
                    // Recompute history in case the agent or command changed
                    const history = this.getHistoryEntriesFromModel(requests, model.sessionId, location, agent.id);
                    const requestProps = await prepareChatAgentRequest(agent, command, enableCommandDetection, request /* Reuse the request object if we already created it for participant detection */, !!detectedAgent);
                    const pendingRequest = this._pendingRequests.get(sessionId);
                    if (pendingRequest && !pendingRequest.requestId) {
                        pendingRequest.requestId = requestProps.requestId;
                    }
                    completeResponseCreated();
                    const agentResult = await this.chatAgentService.invokeAgent(agent.id, requestProps, progressCallback, history, token);
                    rawResult = agentResult;
                    agentOrCommandFollowups = this.chatAgentService.getFollowups(agent.id, requestProps, agentResult, history, followupsCancelToken);
                    chatTitlePromise = model.getRequests().length === 1 && !model.customTitle ? this.chatAgentService.getChatTitle(defaultAgent.id, this.getHistoryEntriesFromModel(model.getRequests(), model.sessionId, location, agent.id), CancellationToken.None) : undefined;
                }
                else if (commandPart && this.chatSlashCommandService.hasCommand(commandPart.slashCommand.command)) {
                    request = model.addRequest(parsedRequest, { variables: [] }, attempt);
                    completeResponseCreated();
                    // contributed slash commands
                    // TODO: spell this out in the UI
                    const history = [];
                    for (const request of model.getRequests()) {
                        if (!request.response) {
                            continue;
                        }
                        history.push({ role: 1 /* ChatMessageRole.User */, content: [{ type: 'text', value: request.message.text }] });
                        history.push({ role: 2 /* ChatMessageRole.Assistant */, content: [{ type: 'text', value: request.response.response.toString() }] });
                    }
                    const message = parsedRequest.text;
                    const commandResult = await this.chatSlashCommandService.executeCommand(commandPart.slashCommand.command, message.substring(commandPart.slashCommand.command.length + 1).trimStart(), new Progress(p => {
                        progressCallback(p);
                    }), history, location, token);
                    agentOrCommandFollowups = Promise.resolve(commandResult?.followUp);
                    rawResult = {};
                }
                else {
                    throw new Error(`Cannot handle request`);
                }
                if (token.isCancellationRequested) {
                    return;
                }
                else {
                    if (!rawResult) {
                        this.trace('sendRequest', `Provider returned no response for session ${model.sessionId}`);
                        rawResult = { errorDetails: { message: localize('emptyResponse', "Provider returned null response") } };
                    }
                    const result = rawResult.errorDetails?.responseIsFiltered ? 'filtered' :
                        rawResult.errorDetails && gotProgress ? 'errorWithOutput' :
                            rawResult.errorDetails ? 'error' :
                                'success';
                    const commandForTelemetry = agentSlashCommandPart ? agentSlashCommandPart.command.name : commandPart?.slashCommand.command;
                    this.telemetryService.publicLog2('interactiveSessionProviderInvoked', {
                        timeToFirstProgress: rawResult.timings?.firstProgress,
                        totalTime: rawResult.timings?.totalElapsed,
                        result,
                        requestType,
                        agent: detectedAgent?.id ?? agentPart?.agent.id ?? '',
                        agentExtensionId: detectedAgent?.extensionId.value ?? agentPart?.agent.extensionId.value ?? '',
                        slashCommand: commandForTelemetry,
                        chatSessionId: model.sessionId,
                        enableCommandDetection,
                        isParticipantDetected: !!detectedAgent,
                        location,
                        citations: request.response?.codeCitations.length ?? 0,
                        numCodeBlocks: getCodeBlocks(request.response?.response.toString() ?? '').length,
                        attachmentKinds: this.attachmentKindsForTelemetry(request.variableData)
                    });
                    model.setResponse(request, rawResult);
                    completeResponseCreated();
                    this.trace('sendRequest', `Provider returned response for session ${model.sessionId}`);
                    model.completeResponse(request);
                    if (agentOrCommandFollowups) {
                        agentOrCommandFollowups.then(followups => {
                            model.setFollowups(request, followups);
                            this._chatServiceTelemetry.retrievedFollowups(agentPart?.agent.id ?? '', commandForTelemetry, followups?.length ?? 0);
                        });
                    }
                    chatTitlePromise?.then(title => {
                        if (title) {
                            model.setCustomTitle(title);
                        }
                    });
                }
            }
            catch (err) {
                const result = 'error';
                this.telemetryService.publicLog2('interactiveSessionProviderInvoked', {
                    timeToFirstProgress: undefined,
                    totalTime: undefined,
                    result,
                    requestType,
                    agent: detectedAgent?.id ?? agentPart?.agent.id ?? '',
                    agentExtensionId: detectedAgent?.extensionId.value ?? agentPart?.agent.extensionId.value ?? '',
                    slashCommand: agentSlashCommandPart ? agentSlashCommandPart.command.name : commandPart?.slashCommand.command,
                    chatSessionId: model.sessionId,
                    location,
                    citations: 0,
                    numCodeBlocks: 0,
                    enableCommandDetection,
                    isParticipantDetected: !!detectedAgent,
                    attachmentKinds: this.attachmentKindsForTelemetry(request.variableData)
                });
                this.logService.error(`Error while handling chat request: ${toErrorMessage(err, true)}`);
                if (request) {
                    const rawResult = { errorDetails: { message: err.message } };
                    model.setResponse(request, rawResult);
                    completeResponseCreated();
                    model.completeResponse(request);
                }
            }
            finally {
                listener.dispose();
            }
        };
        const rawResponsePromise = sendRequestInternal();
        // Note- requestId is not known at this point, assigned later
        this._pendingRequests.set(model.sessionId, this.instantiationService.createInstance(CancellableRequest, source, undefined));
        rawResponsePromise.finally(() => {
            this._pendingRequests.deleteAndDispose(model.sessionId);
        });
        this._onDidSubmitRequest.fire({ chatSessionId: model.sessionId });
        return {
            responseCreatedPromise: responseCreated.p,
            responseCompletePromise: rawResponsePromise,
        };
    }
    async checkAgentAllowed(agent) {
        if (agent.isToolsAgent) {
            const enabled = await this.experimentService.getTreatment('chatAgentEnabled');
            if (enabled === false) {
                throw new Error('Agent is currently disabled');
            }
        }
    }
    attachmentKindsForTelemetry(variableData) {
        // TODO this shows why attachments still have to be cleaned up somewhat
        return variableData.variables.map(v => {
            if (v.kind === 'implicit') {
                return 'implicit';
            }
            else if (v.range) {
                // 'range' is range within the prompt text
                if (v.isTool) {
                    return 'toolInPrompt';
                }
                else {
                    return 'fileInPrompt';
                }
            }
            else if (v.kind === 'command') {
                return 'command';
            }
            else if (v.kind === 'symbol') {
                return 'symbol';
            }
            else if (v.isImage) {
                return 'image';
            }
            else if (v.isDirectory) {
                return 'directory';
            }
            else if (v.isTool) {
                return 'tool';
            }
            else {
                if (URI.isUri(v.value)) {
                    return 'file';
                }
                else if (isLocation(v.value)) {
                    return 'location';
                }
                else {
                    return 'otherAttachment';
                }
            }
        });
    }
    getHistoryEntriesFromModel(requests, sessionId, location, forAgentId) {
        const history = [];
        const agent = this.chatAgentService.getAgent(forAgentId);
        for (const request of requests) {
            if (!request.response) {
                continue;
            }
            if (forAgentId !== request.response.agent?.id && !agent?.isDefault) {
                // An agent only gets to see requests that were sent to this agent.
                // The default agent (the undefined case) gets to see all of them.
                continue;
            }
            const promptTextResult = getPromptText(request.message);
            const historyRequest = {
                sessionId: sessionId,
                requestId: request.id,
                agentId: request.response.agent?.id ?? '',
                message: promptTextResult.message,
                command: request.response.slashCommand?.name,
                variables: updateRanges(request.variableData, promptTextResult.diff), // TODO bit of a hack
                location: ChatAgentLocation.Panel
            };
            history.push({ request: historyRequest, response: toChatHistoryContent(request.response.response.value), result: request.response.result ?? {} });
        }
        return history;
    }
    async removeRequest(sessionId, requestId) {
        const model = this._sessionModels.get(sessionId);
        if (!model) {
            throw new Error(`Unknown session: ${sessionId}`);
        }
        await model.waitForInitialization();
        const pendingRequest = this._pendingRequests.get(sessionId);
        if (pendingRequest?.requestId === requestId) {
            pendingRequest.cancel();
            this._pendingRequests.deleteAndDispose(sessionId);
        }
        model.removeRequest(requestId);
    }
    async adoptRequest(sessionId, request) {
        if (!(request instanceof ChatRequestModel)) {
            throw new TypeError('Can only adopt requests of type ChatRequestModel');
        }
        const target = this._sessionModels.get(sessionId);
        if (!target) {
            throw new Error(`Unknown session: ${sessionId}`);
        }
        await target.waitForInitialization();
        const oldOwner = request.session;
        target.adoptRequest(request);
        if (request.response && !request.response.isComplete) {
            const cts = this._pendingRequests.deleteAndLeak(oldOwner.sessionId);
            if (cts) {
                cts.requestId = request.id;
                this._pendingRequests.set(target.sessionId, cts);
            }
        }
    }
    async addCompleteRequest(sessionId, message, variableData, attempt, response) {
        this.trace('addCompleteRequest', `message: ${message}`);
        const model = this._sessionModels.get(sessionId);
        if (!model) {
            throw new Error(`Unknown session: ${sessionId}`);
        }
        await model.waitForInitialization();
        const parsedRequest = typeof message === 'string' ?
            this.instantiationService.createInstance(ChatRequestParser).parseChatRequest(sessionId, message) :
            message;
        const request = model.addRequest(parsedRequest, variableData || { variables: [] }, attempt ?? 0, undefined, undefined, undefined, undefined, undefined, true);
        if (typeof response.message === 'string') {
            // TODO is this possible?
            model.acceptResponseProgress(request, { content: new MarkdownString(response.message), kind: 'markdownContent' });
        }
        else {
            for (const part of response.message) {
                model.acceptResponseProgress(request, part, true);
            }
        }
        model.setResponse(request, response.result || {});
        if (response.followups !== undefined) {
            model.setFollowups(request, response.followups);
        }
        model.completeResponse(request);
    }
    cancelCurrentRequestForSession(sessionId) {
        this.trace('cancelCurrentRequestForSession', `sessionId: ${sessionId}`);
        this._pendingRequests.get(sessionId)?.cancel();
        this._pendingRequests.deleteAndDispose(sessionId);
    }
    async clearSession(sessionId) {
        this.trace('clearSession', `sessionId: ${sessionId}`);
        const model = this._sessionModels.get(sessionId);
        if (!model) {
            throw new Error(`Unknown session: ${sessionId}`);
        }
        if (model.initialLocation === ChatAgentLocation.Panel) {
            if (this.useFileStorage) {
                if (model.getRequests().length === 0) {
                    await this._chatSessionStore.deleteSession(sessionId);
                }
                else {
                    await this._chatSessionStore.storeSessions([model]);
                }
            }
            else {
                if (model.getRequests().length === 0) {
                    delete this._persistedSessions[sessionId];
                }
                else {
                    // Turn all the real objects into actual JSON, otherwise, calling 'revive' may fail when it tries to
                    // assign values to properties that are getters- microsoft/vscode-copilot-release#1233
                    const sessionData = JSON.parse(JSON.stringify(model));
                    sessionData.isNew = true;
                    this._persistedSessions[sessionId] = sessionData;
                }
            }
        }
        this._sessionModels.deleteAndDispose(sessionId);
        this._pendingRequests.get(sessionId)?.cancel();
        this._pendingRequests.deleteAndDispose(sessionId);
        this._onDidDisposeSession.fire({ sessionId, reason: 'cleared' });
    }
    hasSessions() {
        if (this.useFileStorage) {
            return this._chatSessionStore.hasSessions();
        }
        else {
            return Object.values(this._persistedSessions).length > 0;
        }
    }
    transferChatSession(transferredSessionData, toWorkspace) {
        const model = Iterable.find(this._sessionModels.values(), model => model.sessionId === transferredSessionData.sessionId);
        if (!model) {
            throw new Error(`Failed to transfer session. Unknown session ID: ${transferredSessionData.sessionId}`);
        }
        const existingRaw = this.storageService.getObject(globalChatKey, 0 /* StorageScope.PROFILE */, []);
        existingRaw.push({
            chat: model.toJSON(),
            timestampInMilliseconds: Date.now(),
            toWorkspace: toWorkspace,
            inputValue: transferredSessionData.inputValue,
            location: transferredSessionData.location,
            mode: transferredSessionData.mode,
        });
        this.storageService.store(globalChatKey, JSON.stringify(existingRaw), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        this.trace('transferChatSession', `Transferred session ${model.sessionId} to workspace ${toWorkspace.toString()}`);
    }
    isEditingLocation(location) {
        return location === ChatAgentLocation.EditingSession || this.unifiedViewEnabled;
    }
    getChatStorageFolder() {
        return this._chatSessionStore.getChatStorageFolder();
    }
    logChatIndex() {
        this._chatSessionStore.logIndex();
    }
};
__decorate([
    memoize
], ChatService.prototype, "unifiedViewEnabled", null);
__decorate([
    memoize
], ChatService.prototype, "useFileStorage", null);
ChatService = __decorate([
    __param(0, IStorageService),
    __param(1, ILogService),
    __param(2, IExtensionService),
    __param(3, IInstantiationService),
    __param(4, ITelemetryService),
    __param(5, IWorkspaceContextService),
    __param(6, IChatSlashCommandService),
    __param(7, IChatVariablesService),
    __param(8, IChatAgentService),
    __param(9, IConfigurationService),
    __param(10, IWorkbenchAssignmentService)
], ChatService);
export { ChatService };
function getCodeBlocks(text) {
    const lines = text.split('\n');
    const codeBlockLanguages = [];
    let codeBlockState;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (codeBlockState) {
            if (new RegExp(`^\\s*${codeBlockState.delimiter}\\s*$`).test(line)) {
                codeBlockLanguages.push(codeBlockState.languageId);
                codeBlockState = undefined;
            }
        }
        else {
            const match = line.match(/^(\s*)(`{3,}|~{3,})(\w*)/);
            if (match) {
                codeBlockState = { delimiter: match[2], languageId: match[3] };
            }
        }
    }
    return codeBlockLanguages;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlcnZpY2VJbXBsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NoYXRTZXJ2aWNlSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQzlGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRE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