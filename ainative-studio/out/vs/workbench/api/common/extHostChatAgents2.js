/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { coalesce, isNonEmptyArray } from '../../../base/common/arrays.js';
import { raceCancellation } from '../../../base/common/async.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { Emitter } from '../../../base/common/event.js';
import { Iterable } from '../../../base/common/iterator.js';
import { Disposable, DisposableMap, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { revive } from '../../../base/common/marshalling.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { assertType } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { isChatViewTitleActionContext } from '../../contrib/chat/common/chatActions.js';
import { ChatAgentVoteDirection } from '../../contrib/chat/common/chatService.js';
import { ChatAgentLocation } from '../../contrib/chat/common/constants.js';
import { checkProposedApiEnabled, isProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { MainContext } from './extHost.protocol.js';
import * as typeConvert from './extHostTypeConverters.js';
import * as extHostTypes from './extHostTypes.js';
class ChatAgentResponseStream {
    constructor(_extension, _request, _proxy, _commandsConverter, _sessionDisposables) {
        this._extension = _extension;
        this._request = _request;
        this._proxy = _proxy;
        this._commandsConverter = _commandsConverter;
        this._sessionDisposables = _sessionDisposables;
        this._stopWatch = StopWatch.create(false);
        this._isClosed = false;
    }
    close() {
        this._isClosed = true;
    }
    get timings() {
        return {
            firstProgress: this._firstProgress,
            totalElapsed: this._stopWatch.elapsed()
        };
    }
    get apiObject() {
        if (!this._apiObject) {
            const that = this;
            this._stopWatch.reset();
            function throwIfDone(source) {
                if (that._isClosed) {
                    const err = new Error('Response stream has been closed');
                    Error.captureStackTrace(err, source);
                    throw err;
                }
            }
            const _report = (progress, task) => {
                // Measure the time to the first progress update with real markdown content
                if (typeof this._firstProgress === 'undefined' && (progress.kind === 'markdownContent' || progress.kind === 'markdownVuln')) {
                    this._firstProgress = this._stopWatch.elapsed();
                }
                if (task) {
                    const progressReporterPromise = this._proxy.$handleProgressChunk(this._request.requestId, progress);
                    const progressReporter = {
                        report: (p) => {
                            progressReporterPromise?.then((handle) => {
                                if (handle) {
                                    if (extHostTypes.MarkdownString.isMarkdownString(p.value)) {
                                        this._proxy.$handleProgressChunk(this._request.requestId, typeConvert.ChatResponseWarningPart.from(p), handle);
                                    }
                                    else {
                                        this._proxy.$handleProgressChunk(this._request.requestId, typeConvert.ChatResponseReferencePart.from(p), handle);
                                    }
                                }
                            });
                        }
                    };
                    Promise.all([progressReporterPromise, task?.(progressReporter)]).then(([handle, res]) => {
                        if (handle !== undefined) {
                            this._proxy.$handleProgressChunk(this._request.requestId, typeConvert.ChatTaskResult.from(res), handle);
                        }
                    });
                }
                else {
                    this._proxy.$handleProgressChunk(this._request.requestId, progress);
                }
            };
            this._apiObject = Object.freeze({
                markdown(value) {
                    throwIfDone(this.markdown);
                    const part = new extHostTypes.ChatResponseMarkdownPart(value);
                    const dto = typeConvert.ChatResponseMarkdownPart.from(part);
                    _report(dto);
                    return this;
                },
                markdownWithVulnerabilities(value, vulnerabilities) {
                    throwIfDone(this.markdown);
                    if (vulnerabilities) {
                        checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    }
                    const part = new extHostTypes.ChatResponseMarkdownWithVulnerabilitiesPart(value, vulnerabilities);
                    const dto = typeConvert.ChatResponseMarkdownWithVulnerabilitiesPart.from(part);
                    _report(dto);
                    return this;
                },
                codeblockUri(value, isEdit) {
                    throwIfDone(this.codeblockUri);
                    checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    const part = new extHostTypes.ChatResponseCodeblockUriPart(value, isEdit);
                    const dto = typeConvert.ChatResponseCodeblockUriPart.from(part);
                    _report(dto);
                    return this;
                },
                filetree(value, baseUri) {
                    throwIfDone(this.filetree);
                    const part = new extHostTypes.ChatResponseFileTreePart(value, baseUri);
                    const dto = typeConvert.ChatResponseFilesPart.from(part);
                    _report(dto);
                    return this;
                },
                anchor(value, title) {
                    const part = new extHostTypes.ChatResponseAnchorPart(value, title);
                    return this.push(part);
                },
                button(value) {
                    throwIfDone(this.anchor);
                    const part = new extHostTypes.ChatResponseCommandButtonPart(value);
                    const dto = typeConvert.ChatResponseCommandButtonPart.from(part, that._commandsConverter, that._sessionDisposables);
                    _report(dto);
                    return this;
                },
                progress(value, task) {
                    throwIfDone(this.progress);
                    const part = new extHostTypes.ChatResponseProgressPart2(value, task);
                    const dto = task ? typeConvert.ChatTask.from(part) : typeConvert.ChatResponseProgressPart.from(part);
                    _report(dto, task);
                    return this;
                },
                warning(value) {
                    throwIfDone(this.progress);
                    checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    const part = new extHostTypes.ChatResponseWarningPart(value);
                    const dto = typeConvert.ChatResponseWarningPart.from(part);
                    _report(dto);
                    return this;
                },
                reference(value, iconPath) {
                    return this.reference2(value, iconPath);
                },
                reference2(value, iconPath, options) {
                    throwIfDone(this.reference);
                    if (typeof value === 'object' && 'variableName' in value) {
                        checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    }
                    if (typeof value === 'object' && 'variableName' in value && !value.value) {
                        // The participant used this variable. Does that variable have any references to pull in?
                        const matchingVarData = that._request.variables.variables.find(v => v.name === value.variableName);
                        if (matchingVarData) {
                            let references;
                            if (matchingVarData.references?.length) {
                                references = matchingVarData.references.map(r => ({
                                    kind: 'reference',
                                    reference: { variableName: value.variableName, value: r.reference }
                                }));
                            }
                            else {
                                // Participant sent a variableName reference but the variable produced no references. Show variable reference with no value
                                const part = new extHostTypes.ChatResponseReferencePart(value, iconPath, options);
                                const dto = typeConvert.ChatResponseReferencePart.from(part);
                                references = [dto];
                            }
                            references.forEach(r => _report(r));
                            return this;
                        }
                        else {
                            // Something went wrong- that variable doesn't actually exist
                        }
                    }
                    else {
                        const part = new extHostTypes.ChatResponseReferencePart(value, iconPath, options);
                        const dto = typeConvert.ChatResponseReferencePart.from(part);
                        _report(dto);
                    }
                    return this;
                },
                codeCitation(value, license, snippet) {
                    throwIfDone(this.codeCitation);
                    checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    const part = new extHostTypes.ChatResponseCodeCitationPart(value, license, snippet);
                    const dto = typeConvert.ChatResponseCodeCitationPart.from(part);
                    _report(dto);
                },
                textEdit(target, edits) {
                    throwIfDone(this.textEdit);
                    checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    const part = new extHostTypes.ChatResponseTextEditPart(target, edits);
                    part.isDone = edits === true ? true : undefined;
                    const dto = typeConvert.ChatResponseTextEditPart.from(part);
                    _report(dto);
                    return this;
                },
                notebookEdit(target, edits) {
                    throwIfDone(this.notebookEdit);
                    checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    const part = new extHostTypes.ChatResponseNotebookEditPart(target, edits);
                    const dto = typeConvert.ChatResponseNotebookEditPart.from(part);
                    _report(dto);
                    return this;
                },
                confirmation(title, message, data, buttons) {
                    throwIfDone(this.confirmation);
                    checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    const part = new extHostTypes.ChatResponseConfirmationPart(title, message, data, buttons);
                    const dto = typeConvert.ChatResponseConfirmationPart.from(part);
                    _report(dto);
                    return this;
                },
                push(part) {
                    throwIfDone(this.push);
                    if (part instanceof extHostTypes.ChatResponseTextEditPart ||
                        part instanceof extHostTypes.ChatResponseNotebookEditPart ||
                        part instanceof extHostTypes.ChatResponseMarkdownWithVulnerabilitiesPart ||
                        part instanceof extHostTypes.ChatResponseWarningPart ||
                        part instanceof extHostTypes.ChatResponseConfirmationPart ||
                        part instanceof extHostTypes.ChatResponseCodeCitationPart ||
                        part instanceof extHostTypes.ChatResponseMovePart ||
                        part instanceof extHostTypes.ChatResponseProgressPart2) {
                        checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    }
                    if (part instanceof extHostTypes.ChatResponseReferencePart) {
                        // Ensure variable reference values get fixed up
                        this.reference2(part.value, part.iconPath, part.options);
                    }
                    else if (part instanceof extHostTypes.ChatResponseProgressPart2) {
                        const dto = part.task ? typeConvert.ChatTask.from(part) : typeConvert.ChatResponseProgressPart.from(part);
                        _report(dto, part.task);
                    }
                    else if (part instanceof extHostTypes.ChatResponseAnchorPart) {
                        const dto = typeConvert.ChatResponseAnchorPart.from(part);
                        if (part.resolve) {
                            checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                            dto.resolveId = generateUuid();
                            const cts = new CancellationTokenSource();
                            part.resolve(cts.token)
                                .then(() => {
                                const resolvedDto = typeConvert.ChatResponseAnchorPart.from(part);
                                that._proxy.$handleAnchorResolve(that._request.requestId, dto.resolveId, resolvedDto);
                            })
                                .then(() => cts.dispose(), () => cts.dispose());
                            that._sessionDisposables.add(toDisposable(() => cts.dispose(true)));
                        }
                        _report(dto);
                    }
                    else {
                        const dto = typeConvert.ChatResponsePart.from(part, that._commandsConverter, that._sessionDisposables);
                        _report(dto);
                    }
                    return this;
                },
            });
        }
        return this._apiObject;
    }
}
export class ExtHostChatAgents2 extends Disposable {
    static { this._idPool = 0; }
    static { this._participantDetectionProviderIdPool = 0; }
    static { this._relatedFilesProviderIdPool = 0; }
    constructor(mainContext, _logService, _commands, _documents, _languageModels, _diagnostics, _tools) {
        super();
        this._logService = _logService;
        this._commands = _commands;
        this._documents = _documents;
        this._languageModels = _languageModels;
        this._diagnostics = _diagnostics;
        this._tools = _tools;
        this._agents = new Map();
        this._participantDetectionProviders = new Map();
        this._relatedFilesProviders = new Map();
        this._sessionDisposables = this._register(new DisposableMap());
        this._completionDisposables = this._register(new DisposableMap());
        this._inFlightRequests = new Set();
        this._onDidDisposeChatSession = this._register(new Emitter());
        this.onDidDisposeChatSession = this._onDidDisposeChatSession.event;
        this._proxy = mainContext.getProxy(MainContext.MainThreadChatAgents2);
        _commands.registerArgumentProcessor({
            processArgument: (arg) => {
                // Don't send this argument to extension commands
                if (isChatViewTitleActionContext(arg)) {
                    return null;
                }
                return arg;
            }
        });
    }
    transferActiveChat(newWorkspace) {
        this._proxy.$transferActiveChatSession(newWorkspace);
    }
    createChatAgent(extension, id, handler) {
        const handle = ExtHostChatAgents2._idPool++;
        const agent = new ExtHostChatAgent(extension, id, this._proxy, handle, handler);
        this._agents.set(handle, agent);
        this._proxy.$registerAgent(handle, extension.identifier, id, {}, undefined);
        return agent.apiAgent;
    }
    createDynamicChatAgent(extension, id, dynamicProps, handler) {
        const handle = ExtHostChatAgents2._idPool++;
        const agent = new ExtHostChatAgent(extension, id, this._proxy, handle, handler);
        this._agents.set(handle, agent);
        this._proxy.$registerAgent(handle, extension.identifier, id, { isSticky: true }, dynamicProps);
        return agent.apiAgent;
    }
    registerChatParticipantDetectionProvider(extension, provider) {
        const handle = ExtHostChatAgents2._participantDetectionProviderIdPool++;
        this._participantDetectionProviders.set(handle, new ExtHostParticipantDetector(extension, provider));
        this._proxy.$registerChatParticipantDetectionProvider(handle);
        return toDisposable(() => {
            this._participantDetectionProviders.delete(handle);
            this._proxy.$unregisterChatParticipantDetectionProvider(handle);
        });
    }
    registerRelatedFilesProvider(extension, provider, metadata) {
        const handle = ExtHostChatAgents2._relatedFilesProviderIdPool++;
        this._relatedFilesProviders.set(handle, new ExtHostRelatedFilesProvider(extension, provider));
        this._proxy.$registerRelatedFilesProvider(handle, metadata);
        return toDisposable(() => {
            this._relatedFilesProviders.delete(handle);
            this._proxy.$unregisterRelatedFilesProvider(handle);
        });
    }
    async $provideRelatedFiles(handle, request, token) {
        const provider = this._relatedFilesProviders.get(handle);
        if (!provider) {
            return Promise.resolve([]);
        }
        const extRequestDraft = typeConvert.ChatRequestDraft.to(request);
        return await provider.provider.provideRelatedFiles(extRequestDraft, token) ?? undefined;
    }
    async $detectChatParticipant(handle, requestDto, context, options, token) {
        const detector = this._participantDetectionProviders.get(handle);
        if (!detector) {
            return undefined;
        }
        const { request, location, history } = await this._createRequest(requestDto, context, detector.extension);
        const model = await this.getModelForRequest(request, detector.extension);
        const includeInteractionId = isProposedApiEnabled(detector.extension, 'chatParticipantPrivate');
        const extRequest = typeConvert.ChatAgentRequest.to(includeInteractionId ? request : { ...request, requestId: '' }, location, model, this.getDiagnosticsWhenEnabled(detector.extension), this.getToolsForRequest(detector.extension, request));
        return detector.provider.provideParticipantDetection(extRequest, { history }, { participants: options.participants, location: typeConvert.ChatLocation.to(options.location) }, token);
    }
    async _createRequest(requestDto, context, extension) {
        const request = revive(requestDto);
        const convertedHistory = await this.prepareHistoryTurns(extension, request.agentId, context);
        // in-place converting for location-data
        let location;
        if (request.locationData?.type === ChatAgentLocation.Editor) {
            // editor data
            const document = this._documents.getDocument(request.locationData.document);
            location = new extHostTypes.ChatRequestEditorData(document, typeConvert.Selection.to(request.locationData.selection), typeConvert.Range.to(request.locationData.wholeRange));
        }
        else if (request.locationData?.type === ChatAgentLocation.Notebook) {
            // notebook data
            const cell = this._documents.getDocument(request.locationData.sessionInputUri);
            location = new extHostTypes.ChatRequestNotebookData(cell);
        }
        else if (request.locationData?.type === ChatAgentLocation.Terminal) {
            // TBD
        }
        return { request, location, history: convertedHistory };
    }
    async getModelForRequest(request, extension) {
        let model;
        if (request.userSelectedModelId) {
            model = await this._languageModels.getLanguageModelByIdentifier(extension, request.userSelectedModelId);
        }
        if (!model) {
            model = await this._languageModels.getDefaultLanguageModel(extension);
            if (!model) {
                throw new Error('Language model unavailable');
            }
        }
        return model;
    }
    async $setRequestPaused(handle, requestId, isPaused) {
        const agent = this._agents.get(handle);
        if (!agent) {
            return;
        }
        const inFlight = Iterable.find(this._inFlightRequests, r => r.requestId === requestId);
        if (!inFlight) {
            return;
        }
        agent.setChatRequestPauseState({ request: inFlight.extRequest, isPaused });
    }
    async $invokeAgent(handle, requestDto, context, token) {
        const agent = this._agents.get(handle);
        if (!agent) {
            throw new Error(`[CHAT](${handle}) CANNOT invoke agent because the agent is not registered`);
        }
        let stream;
        let inFlightRequest;
        try {
            const { request, location, history } = await this._createRequest(requestDto, context, agent.extension);
            // Init session disposables
            let sessionDisposables = this._sessionDisposables.get(request.sessionId);
            if (!sessionDisposables) {
                sessionDisposables = new DisposableStore();
                this._sessionDisposables.set(request.sessionId, sessionDisposables);
            }
            stream = new ChatAgentResponseStream(agent.extension, request, this._proxy, this._commands.converter, sessionDisposables);
            const model = await this.getModelForRequest(request, agent.extension);
            const includeInteractionId = isProposedApiEnabled(agent.extension, 'chatParticipantPrivate');
            const extRequest = typeConvert.ChatAgentRequest.to(includeInteractionId ? request : { ...request, requestId: '' }, location, model, this.getDiagnosticsWhenEnabled(agent.extension), this.getToolsForRequest(agent.extension, request));
            inFlightRequest = { requestId: requestDto.requestId, extRequest };
            this._inFlightRequests.add(inFlightRequest);
            const task = agent.invoke(extRequest, { history }, stream.apiObject, token);
            return await raceCancellation(Promise.resolve(task).then((result) => {
                if (result?.metadata) {
                    try {
                        JSON.stringify(result.metadata);
                    }
                    catch (err) {
                        const msg = `result.metadata MUST be JSON.stringify-able. Got error: ${err.message}`;
                        this._logService.error(`[${agent.extension.identifier.value}] [@${agent.id}] ${msg}`, agent.extension);
                        return { errorDetails: { message: msg }, timings: stream?.timings, nextQuestion: result.nextQuestion };
                    }
                }
                let errorDetails;
                if (result?.errorDetails) {
                    errorDetails = {
                        ...result.errorDetails,
                        responseIsIncomplete: true
                    };
                }
                if (errorDetails?.responseIsRedacted || errorDetails?.isQuotaExceeded) {
                    checkProposedApiEnabled(agent.extension, 'chatParticipantPrivate');
                }
                return { errorDetails, timings: stream?.timings, metadata: result?.metadata, nextQuestion: result?.nextQuestion };
            }), token);
        }
        catch (e) {
            this._logService.error(e, agent.extension);
            if (e instanceof extHostTypes.LanguageModelError && e.cause) {
                e = e.cause;
            }
            const isQuotaExceeded = e instanceof Error && e.name === 'ChatQuotaExceeded';
            return { errorDetails: { message: toErrorMessage(e), responseIsIncomplete: true, isQuotaExceeded } };
        }
        finally {
            if (inFlightRequest) {
                this._inFlightRequests.delete(inFlightRequest);
            }
            stream?.close();
        }
    }
    getDiagnosticsWhenEnabled(extension) {
        if (!isProposedApiEnabled(extension, 'chatReferenceDiagnostic')) {
            return [];
        }
        return this._diagnostics.getDiagnostics();
    }
    getToolsForRequest(extension, request) {
        if (!isNonEmptyArray(request.userSelectedTools)) {
            return undefined;
        }
        const selector = new Set(request.userSelectedTools);
        return this._tools.getTools(extension).filter(candidate => selector.has(candidate.name));
    }
    async prepareHistoryTurns(extension, agentId, context) {
        const res = [];
        for (const h of context.history) {
            const ehResult = typeConvert.ChatAgentResult.to(h.result);
            const result = agentId === h.request.agentId ?
                ehResult :
                { ...ehResult, metadata: undefined };
            // REQUEST turn
            const varsWithoutTools = h.request.variables.variables
                .filter(v => !v.isTool)
                .map(v => typeConvert.ChatPromptReference.to(v, this.getDiagnosticsWhenEnabled(extension)));
            const toolReferences = h.request.variables.variables
                .filter(v => v.isTool)
                .map(typeConvert.ChatLanguageModelToolReference.to);
            const turn = new extHostTypes.ChatRequestTurn(h.request.message, h.request.command, varsWithoutTools, h.request.agentId, toolReferences);
            res.push(turn);
            // RESPONSE turn
            const parts = coalesce(h.response.map(r => typeConvert.ChatResponsePart.toContent(r, this._commands.converter)));
            res.push(new extHostTypes.ChatResponseTurn(parts, result, h.request.agentId, h.request.command));
        }
        return res;
    }
    $releaseSession(sessionId) {
        this._sessionDisposables.deleteAndDispose(sessionId);
        this._onDidDisposeChatSession.fire(sessionId);
    }
    async $provideFollowups(requestDto, handle, result, context, token) {
        const agent = this._agents.get(handle);
        if (!agent) {
            return Promise.resolve([]);
        }
        const request = revive(requestDto);
        const convertedHistory = await this.prepareHistoryTurns(agent.extension, agent.id, context);
        const ehResult = typeConvert.ChatAgentResult.to(result);
        return (await agent.provideFollowups(ehResult, { history: convertedHistory }, token))
            .filter(f => {
            // The followup must refer to a participant that exists from the same extension
            const isValid = !f.participant || Iterable.some(this._agents.values(), a => a.id === f.participant && ExtensionIdentifier.equals(a.extension.identifier, agent.extension.identifier));
            if (!isValid) {
                this._logService.warn(`[@${agent.id}] ChatFollowup refers to an unknown participant: ${f.participant}`);
            }
            return isValid;
        })
            .map(f => typeConvert.ChatFollowup.from(f, request));
    }
    $acceptFeedback(handle, result, voteAction) {
        const agent = this._agents.get(handle);
        if (!agent) {
            return;
        }
        const ehResult = typeConvert.ChatAgentResult.to(result);
        let kind;
        switch (voteAction.direction) {
            case ChatAgentVoteDirection.Down:
                kind = extHostTypes.ChatResultFeedbackKind.Unhelpful;
                break;
            case ChatAgentVoteDirection.Up:
                kind = extHostTypes.ChatResultFeedbackKind.Helpful;
                break;
        }
        const feedback = {
            result: ehResult,
            kind,
            unhelpfulReason: isProposedApiEnabled(agent.extension, 'chatParticipantAdditions') ? voteAction.reason : undefined,
        };
        agent.acceptFeedback(Object.freeze(feedback));
    }
    $acceptAction(handle, result, event) {
        const agent = this._agents.get(handle);
        if (!agent) {
            return;
        }
        if (event.action.kind === 'vote') {
            // handled by $acceptFeedback
            return;
        }
        const ehAction = typeConvert.ChatAgentUserActionEvent.to(result, event, this._commands.converter);
        if (ehAction) {
            agent.acceptAction(Object.freeze(ehAction));
        }
    }
    async $invokeCompletionProvider(handle, query, token) {
        const agent = this._agents.get(handle);
        if (!agent) {
            return [];
        }
        let disposables = this._completionDisposables.get(handle);
        if (disposables) {
            // Clear any disposables from the last invocation of this completion provider
            disposables.clear();
        }
        else {
            disposables = new DisposableStore();
            this._completionDisposables.set(handle, disposables);
        }
        const items = await agent.invokeCompletionProvider(query, token);
        return items.map((i) => typeConvert.ChatAgentCompletionItem.from(i, this._commands.converter, disposables));
    }
    async $provideChatTitle(handle, context, token) {
        const agent = this._agents.get(handle);
        if (!agent) {
            return;
        }
        const history = await this.prepareHistoryTurns(agent.extension, agent.id, { history: context });
        return await agent.provideTitle({ history }, token);
    }
    async $provideSampleQuestions(handle, location, token) {
        const agent = this._agents.get(handle);
        if (!agent) {
            return;
        }
        return (await agent.provideSampleQuestions(typeConvert.ChatLocation.to(location), token))
            .map(f => typeConvert.ChatFollowup.from(f, undefined));
    }
}
class ExtHostParticipantDetector {
    constructor(extension, provider) {
        this.extension = extension;
        this.provider = provider;
    }
}
class ExtHostRelatedFilesProvider {
    constructor(extension, provider) {
        this.extension = extension;
        this.provider = provider;
    }
}
class ExtHostChatAgent {
    constructor(extension, id, _proxy, _handle, _requestHandler) {
        this.extension = extension;
        this.id = id;
        this._proxy = _proxy;
        this._handle = _handle;
        this._requestHandler = _requestHandler;
        this._onDidReceiveFeedback = new Emitter();
        this._onDidPerformAction = new Emitter();
        this._pauseStateEmitter = new Emitter();
    }
    acceptFeedback(feedback) {
        this._onDidReceiveFeedback.fire(feedback);
    }
    acceptAction(event) {
        this._onDidPerformAction.fire(event);
    }
    setChatRequestPauseState(pauseState) {
        this._pauseStateEmitter.fire(pauseState);
    }
    async invokeCompletionProvider(query, token) {
        if (!this._agentVariableProvider) {
            return [];
        }
        return await this._agentVariableProvider.provider.provideCompletionItems(query, token) ?? [];
    }
    async provideFollowups(result, context, token) {
        if (!this._followupProvider) {
            return [];
        }
        const followups = await this._followupProvider.provideFollowups(result, context, token);
        if (!followups) {
            return [];
        }
        return followups
            // Filter out "command followups" from older providers
            .filter(f => !(f && 'commandId' in f))
            // Filter out followups from older providers before 'message' changed to 'prompt'
            .filter(f => !(f && 'message' in f));
    }
    async provideTitle(context, token) {
        if (!this._titleProvider) {
            return;
        }
        return await this._titleProvider.provideChatTitle(context, token) ?? undefined;
    }
    async provideSampleQuestions(location, token) {
        if (!this._welcomeMessageProvider || !this._welcomeMessageProvider.provideSampleQuestions) {
            return [];
        }
        const content = await this._welcomeMessageProvider.provideSampleQuestions(location, token);
        if (!content) {
            return [];
        }
        return content;
    }
    get apiAgent() {
        let disposed = false;
        let updateScheduled = false;
        const updateMetadataSoon = () => {
            if (disposed) {
                return;
            }
            if (updateScheduled) {
                return;
            }
            updateScheduled = true;
            queueMicrotask(() => {
                this._proxy.$updateAgent(this._handle, {
                    icon: !this._iconPath ? undefined :
                        this._iconPath instanceof URI ? this._iconPath :
                            'light' in this._iconPath ? this._iconPath.light :
                                undefined,
                    iconDark: !this._iconPath ? undefined :
                        'dark' in this._iconPath ? this._iconPath.dark :
                            undefined,
                    themeIcon: this._iconPath instanceof extHostTypes.ThemeIcon ? this._iconPath : undefined,
                    hasFollowups: this._followupProvider !== undefined,
                    helpTextPrefix: (!this._helpTextPrefix || typeof this._helpTextPrefix === 'string') ? this._helpTextPrefix : typeConvert.MarkdownString.from(this._helpTextPrefix),
                    helpTextVariablesPrefix: (!this._helpTextVariablesPrefix || typeof this._helpTextVariablesPrefix === 'string') ? this._helpTextVariablesPrefix : typeConvert.MarkdownString.from(this._helpTextVariablesPrefix),
                    helpTextPostfix: (!this._helpTextPostfix || typeof this._helpTextPostfix === 'string') ? this._helpTextPostfix : typeConvert.MarkdownString.from(this._helpTextPostfix),
                    supportIssueReporting: this._supportIssueReporting,
                    requester: this._requester,
                    welcomeMessageContent: this._welcomeMessageContent && {
                        ...this._welcomeMessageContent,
                        message: typeConvert.MarkdownString.from(this._welcomeMessageContent.message),
                    }
                });
                updateScheduled = false;
            });
        };
        const that = this;
        return {
            get id() {
                return that.id;
            },
            get iconPath() {
                return that._iconPath;
            },
            set iconPath(v) {
                that._iconPath = v;
                updateMetadataSoon();
            },
            get requestHandler() {
                return that._requestHandler;
            },
            set requestHandler(v) {
                assertType(typeof v === 'function', 'Invalid request handler');
                that._requestHandler = v;
            },
            get followupProvider() {
                return that._followupProvider;
            },
            set followupProvider(v) {
                that._followupProvider = v;
                updateMetadataSoon();
            },
            get helpTextPrefix() {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                return that._helpTextPrefix;
            },
            set helpTextPrefix(v) {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                that._helpTextPrefix = v;
                updateMetadataSoon();
            },
            get helpTextVariablesPrefix() {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                return that._helpTextVariablesPrefix;
            },
            set helpTextVariablesPrefix(v) {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                that._helpTextVariablesPrefix = v;
                updateMetadataSoon();
            },
            get helpTextPostfix() {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                return that._helpTextPostfix;
            },
            set helpTextPostfix(v) {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                that._helpTextPostfix = v;
                updateMetadataSoon();
            },
            get supportIssueReporting() {
                checkProposedApiEnabled(that.extension, 'chatParticipantPrivate');
                return that._supportIssueReporting;
            },
            set supportIssueReporting(v) {
                checkProposedApiEnabled(that.extension, 'chatParticipantPrivate');
                that._supportIssueReporting = v;
                updateMetadataSoon();
            },
            get onDidReceiveFeedback() {
                return that._onDidReceiveFeedback.event;
            },
            set participantVariableProvider(v) {
                checkProposedApiEnabled(that.extension, 'chatParticipantAdditions');
                that._agentVariableProvider = v;
                if (v) {
                    if (!v.triggerCharacters.length) {
                        throw new Error('triggerCharacters are required');
                    }
                    that._proxy.$registerAgentCompletionsProvider(that._handle, that.id, v.triggerCharacters);
                }
                else {
                    that._proxy.$unregisterAgentCompletionsProvider(that._handle, that.id);
                }
            },
            get participantVariableProvider() {
                checkProposedApiEnabled(that.extension, 'chatParticipantAdditions');
                return that._agentVariableProvider;
            },
            set welcomeMessageProvider(v) {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                that._welcomeMessageProvider = v;
                updateMetadataSoon();
            },
            get welcomeMessageProvider() {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                return that._welcomeMessageProvider;
            },
            set welcomeMessageContent(v) {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                that._welcomeMessageContent = v;
                updateMetadataSoon();
            },
            get welcomeMessageContent() {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                return that._welcomeMessageContent;
            },
            set titleProvider(v) {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                that._titleProvider = v;
                updateMetadataSoon();
            },
            get titleProvider() {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                return that._titleProvider;
            },
            get onDidChangePauseState() {
                checkProposedApiEnabled(that.extension, 'chatParticipantAdditions');
                return that._pauseStateEmitter.event;
            },
            onDidPerformAction: !isProposedApiEnabled(this.extension, 'chatParticipantAdditions')
                ? undefined
                : this._onDidPerformAction.event,
            set requester(v) {
                that._requester = v;
                updateMetadataSoon();
            },
            get requester() {
                return that._requester;
            },
            dispose() {
                disposed = true;
                that._followupProvider = undefined;
                that._onDidReceiveFeedback.dispose();
                that._proxy.$unregisterAgent(that._handle);
            },
        };
    }
    invoke(request, context, response, token) {
        return this._requestHandler(request, context, response, token);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENoYXRBZ2VudHMyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RDaGF0QWdlbnRzMi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2pFLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0csT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDM0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUU1RCxPQUFPLEVBQUUsbUJBQW1CLEVBQXVELE1BQU0sbURBQW1ELENBQUM7QUFFN0ksT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFHeEYsT0FBTyxFQUFFLHNCQUFzQixFQUEw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