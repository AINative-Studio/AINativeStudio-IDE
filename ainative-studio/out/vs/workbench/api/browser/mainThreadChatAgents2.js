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
import { DeferredPromise } from '../../../base/common/async.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { revive } from '../../../base/common/marshalling.js';
import { escapeRegExpCharacters } from '../../../base/common/strings.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { URI } from '../../../base/common/uri.js';
import { Range } from '../../../editor/common/core/range.js';
import { getWordAtText } from '../../../editor/common/core/wordHelper.js';
import { ILanguageFeaturesService } from '../../../editor/common/services/languageFeatures.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IChatWidgetService } from '../../contrib/chat/browser/chat.js';
import { ChatInputPart } from '../../contrib/chat/browser/chatInputPart.js';
import { AddDynamicVariableAction } from '../../contrib/chat/browser/contrib/chatDynamicVariables.js';
import { IChatAgentService } from '../../contrib/chat/common/chatAgents.js';
import { IChatEditingService } from '../../contrib/chat/common/chatEditingService.js';
import { ChatRequestAgentPart } from '../../contrib/chat/common/chatParserTypes.js';
import { ChatRequestParser } from '../../contrib/chat/common/chatRequestParser.js';
import { IChatService } from '../../contrib/chat/common/chatService.js';
import { ChatAgentLocation } from '../../contrib/chat/common/constants.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { NotebookDto } from './mainThreadNotebookDto.js';
export class MainThreadChatTask {
    get onDidAddProgress() { return this._onDidAddProgress.event; }
    constructor(content) {
        this.content = content;
        this.kind = 'progressTask';
        this.deferred = new DeferredPromise();
        this._onDidAddProgress = new Emitter();
        this.progress = [];
    }
    task() {
        return this.deferred.p;
    }
    isSettled() {
        return this.deferred.isSettled;
    }
    complete(v) {
        this.deferred.complete(v);
    }
    add(progress) {
        this.progress.push(progress);
        this._onDidAddProgress.fire(progress);
    }
}
let MainThreadChatAgents2 = class MainThreadChatAgents2 extends Disposable {
    constructor(extHostContext, _chatAgentService, _chatService, _chatEditingService, _languageFeaturesService, _chatWidgetService, _instantiationService, _logService, _extensionService) {
        super();
        this._chatAgentService = _chatAgentService;
        this._chatService = _chatService;
        this._chatEditingService = _chatEditingService;
        this._languageFeaturesService = _languageFeaturesService;
        this._chatWidgetService = _chatWidgetService;
        this._instantiationService = _instantiationService;
        this._logService = _logService;
        this._extensionService = _extensionService;
        this._agents = this._register(new DisposableMap());
        this._agentCompletionProviders = this._register(new DisposableMap());
        this._agentIdsToCompletionProviders = this._register(new DisposableMap);
        this._chatParticipantDetectionProviders = this._register(new DisposableMap());
        this._chatRelatedFilesProviders = this._register(new DisposableMap());
        this._pendingProgress = new Map();
        this._responsePartHandlePool = 0;
        this._activeTasks = new Map();
        this._unresolvedAnchors = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostChatAgents2);
        this._register(this._chatService.onDidDisposeSession(e => {
            this._proxy.$releaseSession(e.sessionId);
        }));
        this._register(this._chatService.onDidPerformUserAction(e => {
            if (typeof e.agentId === 'string') {
                for (const [handle, agent] of this._agents) {
                    if (agent.id === e.agentId) {
                        if (e.action.kind === 'vote') {
                            this._proxy.$acceptFeedback(handle, e.result ?? {}, e.action);
                        }
                        else {
                            this._proxy.$acceptAction(handle, e.result || {}, e);
                        }
                        break;
                    }
                }
            }
        }));
    }
    $unregisterAgent(handle) {
        this._agents.deleteAndDispose(handle);
    }
    $transferActiveChatSession(toWorkspace) {
        const widget = this._chatWidgetService.lastFocusedWidget;
        const sessionId = widget?.viewModel?.model.sessionId;
        if (!sessionId) {
            this._logService.error(`MainThreadChat#$transferActiveChatSession: No active chat session found`);
            return;
        }
        const inputValue = widget?.inputEditor.getValue() ?? '';
        const location = widget.location;
        const mode = widget.input.currentMode;
        this._chatService.transferChatSession({ sessionId, inputValue, location, mode }, URI.revive(toWorkspace));
    }
    async $registerAgent(handle, extension, id, metadata, dynamicProps) {
        await this._extensionService.whenInstalledExtensionsRegistered();
        const staticAgentRegistration = this._chatAgentService.getAgent(id, true);
        if (!staticAgentRegistration && !dynamicProps) {
            if (this._chatAgentService.getAgentsByName(id).length) {
                // Likely some extension authors will not adopt the new ID, so give a hint if they register a
                // participant by name instead of ID.
                throw new Error(`chatParticipant must be declared with an ID in package.json. The "id" property may be missing! "${id}"`);
            }
            throw new Error(`chatParticipant must be declared in package.json: ${id}`);
        }
        const impl = {
            invoke: async (request, progress, history, token) => {
                this._pendingProgress.set(request.requestId, progress);
                try {
                    return await this._proxy.$invokeAgent(handle, request, { history }, token) ?? {};
                }
                finally {
                    this._pendingProgress.delete(request.requestId);
                }
            },
            setRequestPaused: (requestId, isPaused) => {
                this._proxy.$setRequestPaused(handle, requestId, isPaused);
            },
            provideFollowups: async (request, result, history, token) => {
                if (!this._agents.get(handle)?.hasFollowups) {
                    return [];
                }
                return this._proxy.$provideFollowups(request, handle, result, { history }, token);
            },
            provideChatTitle: (history, token) => {
                return this._proxy.$provideChatTitle(handle, history, token);
            },
            provideSampleQuestions: (location, token) => {
                return this._proxy.$provideSampleQuestions(handle, location, token);
            }
        };
        let disposable;
        if (!staticAgentRegistration && dynamicProps) {
            const extensionDescription = this._extensionService.extensions.find(e => ExtensionIdentifier.equals(e.identifier, extension));
            disposable = this._chatAgentService.registerDynamicAgent({
                id,
                name: dynamicProps.name,
                description: dynamicProps.description,
                extensionId: extension,
                extensionDisplayName: extensionDescription?.displayName ?? extension.value,
                extensionPublisherId: extensionDescription?.publisher ?? '',
                publisherDisplayName: dynamicProps.publisherName,
                fullName: dynamicProps.fullName,
                metadata: revive(metadata),
                slashCommands: [],
                disambiguation: [],
                locations: [ChatAgentLocation.Panel], // TODO all dynamic participants are panel only?
            }, impl);
        }
        else {
            disposable = this._chatAgentService.registerAgentImplementation(id, impl);
        }
        this._agents.set(handle, {
            id: id,
            extensionId: extension,
            dispose: disposable.dispose,
            hasFollowups: metadata.hasFollowups
        });
    }
    async $updateAgent(handle, metadataUpdate) {
        await this._extensionService.whenInstalledExtensionsRegistered();
        const data = this._agents.get(handle);
        if (!data) {
            this._logService.error(`MainThreadChatAgents2#$updateAgent: No agent with handle ${handle} registered`);
            return;
        }
        data.hasFollowups = metadataUpdate.hasFollowups;
        this._chatAgentService.updateAgent(data.id, revive(metadataUpdate));
    }
    async $handleProgressChunk(requestId, progress, responsePartHandle) {
        const revivedProgress = progress.kind === 'notebookEdit' ? ChatNotebookEdit.fromChatEdit(revive(progress)) : revive(progress);
        if (revivedProgress.kind === 'progressTask') {
            const handle = ++this._responsePartHandlePool;
            const responsePartId = `${requestId}_${handle}`;
            const task = new MainThreadChatTask(revivedProgress.content);
            this._activeTasks.set(responsePartId, task);
            this._pendingProgress.get(requestId)?.(task);
            return handle;
        }
        else if (responsePartHandle !== undefined) {
            const responsePartId = `${requestId}_${responsePartHandle}`;
            const task = this._activeTasks.get(responsePartId);
            switch (revivedProgress.kind) {
                case 'progressTaskResult':
                    if (task && revivedProgress.content) {
                        task.complete(revivedProgress.content.value);
                        this._activeTasks.delete(responsePartId);
                    }
                    else {
                        task?.complete(undefined);
                    }
                    return responsePartHandle;
                case 'warning':
                case 'reference':
                    task?.add(revivedProgress);
                    return;
            }
        }
        if (revivedProgress.kind === 'inlineReference' && revivedProgress.resolveId) {
            if (!this._unresolvedAnchors.has(requestId)) {
                this._unresolvedAnchors.set(requestId, new Map());
            }
            this._unresolvedAnchors.get(requestId)?.set(revivedProgress.resolveId, revivedProgress);
        }
        this._pendingProgress.get(requestId)?.(revivedProgress);
    }
    $handleAnchorResolve(requestId, handle, resolveAnchor) {
        const anchor = this._unresolvedAnchors.get(requestId)?.get(handle);
        if (!anchor) {
            return;
        }
        this._unresolvedAnchors.get(requestId)?.delete(handle);
        if (resolveAnchor) {
            const revivedAnchor = revive(resolveAnchor);
            anchor.inlineReference = revivedAnchor.inlineReference;
        }
    }
    $registerAgentCompletionsProvider(handle, id, triggerCharacters) {
        const provide = async (query, token) => {
            const completions = await this._proxy.$invokeCompletionProvider(handle, query, token);
            return completions.map((c) => ({ ...c, icon: c.icon ? ThemeIcon.fromId(c.icon) : undefined }));
        };
        this._agentIdsToCompletionProviders.set(id, this._chatAgentService.registerAgentCompletionProvider(id, provide));
        this._agentCompletionProviders.set(handle, this._languageFeaturesService.completionProvider.register({ scheme: ChatInputPart.INPUT_SCHEME, hasAccessToAllModels: true }, {
            _debugDisplayName: 'chatAgentCompletions:' + handle,
            triggerCharacters,
            provideCompletionItems: async (model, position, _context, token) => {
                const widget = this._chatWidgetService.getWidgetByInputUri(model.uri);
                if (!widget || !widget.viewModel) {
                    return;
                }
                const triggerCharsPart = triggerCharacters.map(c => escapeRegExpCharacters(c)).join('');
                const wordRegex = new RegExp(`[${triggerCharsPart}]\\S*`, 'g');
                const query = getWordAtText(position.column, wordRegex, model.getLineContent(position.lineNumber), 0)?.word ?? '';
                if (query && !triggerCharacters.some(c => query.startsWith(c))) {
                    return;
                }
                const parsedRequest = this._instantiationService.createInstance(ChatRequestParser).parseChatRequest(widget.viewModel.sessionId, model.getValue()).parts;
                const agentPart = parsedRequest.find((part) => part instanceof ChatRequestAgentPart);
                const thisAgentId = this._agents.get(handle)?.id;
                if (agentPart?.agent.id !== thisAgentId) {
                    return;
                }
                const range = computeCompletionRanges(model, position, wordRegex);
                if (!range) {
                    return null;
                }
                const result = await provide(query, token);
                const variableItems = result.map(v => {
                    const insertText = v.insertText ?? (typeof v.label === 'string' ? v.label : v.label.label);
                    const rangeAfterInsert = new Range(range.insert.startLineNumber, range.insert.startColumn, range.insert.endLineNumber, range.insert.startColumn + insertText.length);
                    return {
                        label: v.label,
                        range,
                        insertText: insertText + ' ',
                        kind: 18 /* CompletionItemKind.Text */,
                        detail: v.detail,
                        documentation: v.documentation,
                        command: { id: AddDynamicVariableAction.ID, title: '', arguments: [{ id: v.id, widget, range: rangeAfterInsert, variableData: revive(v.value), command: v.command }] }
                    };
                });
                return {
                    suggestions: variableItems
                };
            }
        }));
    }
    $unregisterAgentCompletionsProvider(handle, id) {
        this._agentCompletionProviders.deleteAndDispose(handle);
        this._agentIdsToCompletionProviders.deleteAndDispose(id);
    }
    $registerChatParticipantDetectionProvider(handle) {
        this._chatParticipantDetectionProviders.set(handle, this._chatAgentService.registerChatParticipantDetectionProvider(handle, {
            provideParticipantDetection: async (request, history, options, token) => {
                return await this._proxy.$detectChatParticipant(handle, request, { history }, options, token);
            }
        }));
    }
    $unregisterChatParticipantDetectionProvider(handle) {
        this._chatParticipantDetectionProviders.deleteAndDispose(handle);
    }
    $registerRelatedFilesProvider(handle, metadata) {
        this._chatRelatedFilesProviders.set(handle, this._chatEditingService.registerRelatedFilesProvider(handle, {
            description: metadata.description,
            provideRelatedFiles: async (request, token) => {
                return (await this._proxy.$provideRelatedFiles(handle, request, token))?.map((v) => ({ uri: URI.from(v.uri), description: v.description })) ?? [];
            }
        }));
    }
    $unregisterRelatedFilesProvider(handle) {
        this._chatRelatedFilesProviders.deleteAndDispose(handle);
    }
};
MainThreadChatAgents2 = __decorate([
    extHostNamedCustomer(MainContext.MainThreadChatAgents2),
    __param(1, IChatAgentService),
    __param(2, IChatService),
    __param(3, IChatEditingService),
    __param(4, ILanguageFeaturesService),
    __param(5, IChatWidgetService),
    __param(6, IInstantiationService),
    __param(7, ILogService),
    __param(8, IExtensionService)
], MainThreadChatAgents2);
export { MainThreadChatAgents2 };
function computeCompletionRanges(model, position, reg) {
    const varWord = getWordAtText(position.column, reg, model.getLineContent(position.lineNumber), 0);
    if (!varWord && model.getWordUntilPosition(position).word) {
        // inside a "normal" word
        return;
    }
    let insert;
    let replace;
    if (!varWord) {
        insert = replace = Range.fromPositions(position);
    }
    else {
        insert = new Range(position.lineNumber, varWord.startColumn, position.lineNumber, position.column);
        replace = new Range(position.lineNumber, varWord.startColumn, position.lineNumber, varWord.endColumn);
    }
    return { insert, replace };
}
var ChatNotebookEdit;
(function (ChatNotebookEdit) {
    function fromChatEdit(part) {
        return {
            kind: 'notebookEdit',
            uri: part.uri,
            done: part.done,
            edits: part.edits.map(NotebookDto.fromCellEditOperationDto)
        };
    }
    ChatNotebookEdit.fromChatEdit = fromChatEdit;
})(ChatNotebookEdit || (ChatNotebookEdit = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENoYXRBZ2VudHMyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkQ2hhdEFnZW50czIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRWhFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUUvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBQzNGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQztBQUVqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDN0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRzFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQy9GLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENB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