/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { URI } from '../../../../base/common/uri.js';
import { Emitter } from '../../../../base/common/event.js';
import { ILLMMessageService } from '../common/sendLLMMessageService.js';
import { chat_userMessageContent, isABuiltinToolName } from '../common/prompt/prompts.js';
import { getErrorMessage } from '../common/sendLLMMessageTypes.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IVoidSettingsService } from '../common/voidSettingsService.js';
import { approvalTypeOfBuiltinToolName } from '../common/toolsServiceTypes.js';
import { IToolsService } from './toolsService.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { Position } from '../../../../editor/common/core/position.js';
import { IMetricsService } from '../common/metricsService.js';
import { shorten } from '../../../../base/common/labels.js';
import { IVoidModelService } from '../common/voidModelService.js';
import { findLast, findLastIdx } from '../../../../base/common/arraysFind.js';
import { IEditCodeService } from './editCodeServiceInterface.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { truncate } from '../../../../base/common/strings.js';
import { THREAD_STORAGE_KEY } from '../common/storageKeys.js';
import { IConvertToLLMMessageService } from './convertToLLMMessageService.js';
import { timeout } from '../../../../base/common/async.js';
import { deepClone } from '../../../../base/common/objects.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IDirectoryStrService } from '../common/directoryStrService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IMCPService } from '../common/mcpService.js';
// related to retrying when LLM message has error
const CHAT_RETRIES = 3;
const RETRY_DELAY = 2500;
const findStagingSelectionIndex = (currentSelections, newSelection) => {
    if (!currentSelections)
        return null;
    for (let i = 0; i < currentSelections.length; i += 1) {
        const s = currentSelections[i];
        if (s.uri.fsPath !== newSelection.uri.fsPath)
            continue;
        if (s.type === 'File' && newSelection.type === 'File') {
            return i;
        }
        if (s.type === 'CodeSelection' && newSelection.type === 'CodeSelection') {
            if (s.uri.fsPath !== newSelection.uri.fsPath)
                continue;
            // if there's any collision return true
            const [oldStart, oldEnd] = s.range;
            const [newStart, newEnd] = newSelection.range;
            if (oldStart !== newStart || oldEnd !== newEnd)
                continue;
            return i;
        }
        if (s.type === 'Folder' && newSelection.type === 'Folder') {
            return i;
        }
    }
    return null;
};
const defaultMessageState = {
    stagingSelections: [],
    isBeingEdited: false,
};
const newThreadObject = () => {
    const now = new Date().toISOString();
    return {
        id: generateUuid(),
        createdAt: now,
        lastModified: now,
        messages: [],
        state: {
            currCheckpointIdx: null,
            stagingSelections: [],
            focusedMessageIdx: undefined,
            linksOfMessageIdx: {},
        },
        filesWithUserChanges: new Set()
    };
};
export const IChatThreadService = createDecorator('voidChatThreadService');
let ChatThreadService = class ChatThreadService extends Disposable {
    // used in checkpointing
    // private readonly _userModifiedFilesToCheckInCheckpoints = new LRUCache<string, null>(50)
    constructor(_storageService, _voidModelService, _llmMessageService, _toolsService, _settingsService, _languageFeaturesService, _metricsService, _editCodeService, _notificationService, _convertToLLMMessagesService, _workspaceContextService, _directoryStringService, _fileService, _mcpService) {
        super();
        this._storageService = _storageService;
        this._voidModelService = _voidModelService;
        this._llmMessageService = _llmMessageService;
        this._toolsService = _toolsService;
        this._settingsService = _settingsService;
        this._languageFeaturesService = _languageFeaturesService;
        this._metricsService = _metricsService;
        this._editCodeService = _editCodeService;
        this._notificationService = _notificationService;
        this._convertToLLMMessagesService = _convertToLLMMessagesService;
        this._workspaceContextService = _workspaceContextService;
        this._directoryStringService = _directoryStringService;
        this._fileService = _fileService;
        this._mcpService = _mcpService;
        // this fires when the current thread changes at all (a switch of currentThread, or a message added to it, etc)
        this._onDidChangeCurrentThread = new Emitter();
        this.onDidChangeCurrentThread = this._onDidChangeCurrentThread.event;
        this._onDidChangeStreamState = new Emitter();
        this.onDidChangeStreamState = this._onDidChangeStreamState.event;
        this.streamState = {};
        this.dangerousSetState = (newState) => {
            this.state = newState;
            this._onDidChangeCurrentThread.fire();
        };
        this.resetState = () => {
            this.state = { allThreads: {}, currentThreadId: null }; // see constructor
            this.openNewThread();
            this._onDidChangeCurrentThread.fire();
        };
        // ---------- streaming ----------
        this._currentModelSelectionProps = () => {
            // these settings should not change throughout the loop (eg anthropic breaks if you change its thinking mode and it's using tools)
            const featureName = 'Chat';
            const modelSelection = this._settingsService.state.modelSelectionOfFeature[featureName];
            const modelSelectionOptions = modelSelection ? this._settingsService.state.optionsOfModelSelection[featureName][modelSelection.providerName]?.[modelSelection.modelName] : undefined;
            return { modelSelection, modelSelectionOptions };
        };
        this._swapOutLatestStreamingToolWithResult = (threadId, tool) => {
            const messages = this.state.allThreads[threadId]?.messages;
            if (!messages)
                return false;
            const lastMsg = messages[messages.length - 1];
            if (!lastMsg)
                return false;
            if (lastMsg.role === 'tool' && lastMsg.type !== 'invalid_params') {
                this._editMessageInThread(threadId, messages.length - 1, tool);
                return true;
            }
            return false;
        };
        this._updateLatestTool = (threadId, tool) => {
            const swapped = this._swapOutLatestStreamingToolWithResult(threadId, tool);
            if (swapped)
                return;
            this._addMessageToThread(threadId, tool);
        };
        this._computeMCPServerOfToolName = (toolName) => {
            return this._mcpService.getMCPTools()?.find(t => t.name === toolName)?.mcpServerName;
        };
        this.toolErrMsgs = {
            rejected: 'Tool call was rejected by the user.',
            interrupted: 'Tool call was interrupted by the user.',
            errWhenStringifying: (error) => `Tool call succeeded, but there was an error stringifying the output.\n${getErrorMessage(error)}`
        };
        // private readonly _currentlyRunningToolInterruptor: { [threadId: string]: (() => void) | undefined } = {}
        // returns true when the tool call is waiting for user approval
        this._runToolCall = async (threadId, toolName, toolId, mcpServerName, opts) => {
            // compute these below
            let toolParams;
            let toolResult;
            let toolResultStr;
            // Check if it's a built-in tool
            const isBuiltInTool = isABuiltinToolName(toolName);
            if (!opts.preapproved) { // skip this if pre-approved
                // 1. validate tool params
                try {
                    if (isBuiltInTool) {
                        const params = this._toolsService.validateParams[toolName](opts.unvalidatedToolParams);
                        toolParams = params;
                    }
                    else {
                        toolParams = opts.unvalidatedToolParams;
                    }
                }
                catch (error) {
                    const errorMessage = getErrorMessage(error);
                    this._addMessageToThread(threadId, { role: 'tool', type: 'invalid_params', rawParams: opts.unvalidatedToolParams, result: null, name: toolName, content: errorMessage, id: toolId, mcpServerName });
                    return {};
                }
                // once validated, add checkpoint for edit
                if (toolName === 'edit_file') {
                    this._addToolEditCheckpoint({ threadId, uri: toolParams.uri });
                }
                if (toolName === 'rewrite_file') {
                    this._addToolEditCheckpoint({ threadId, uri: toolParams.uri });
                }
                // 2. if tool requires approval, break from the loop, awaiting approval
                const approvalType = isBuiltInTool ? approvalTypeOfBuiltinToolName[toolName] : 'MCP tools';
                if (approvalType) {
                    const autoApprove = this._settingsService.state.globalSettings.autoApprove[approvalType];
                    // add a tool_request because we use it for UI if a tool is loading (this should be improved in the future)
                    this._addMessageToThread(threadId, { role: 'tool', type: 'tool_request', content: '(Awaiting user permission...)', result: null, name: toolName, params: toolParams, id: toolId, rawParams: opts.unvalidatedToolParams, mcpServerName });
                    if (!autoApprove) {
                        return { awaitingUserApproval: true };
                    }
                }
            }
            else {
                toolParams = opts.validatedParams;
            }
            // 3. call the tool
            // this._setStreamState(threadId, { isRunning: 'tool' }, 'merge')
            const runningTool = { role: 'tool', type: 'running_now', name: toolName, params: toolParams, content: '(value not received yet...)', result: null, id: toolId, rawParams: opts.unvalidatedToolParams, mcpServerName };
            this._updateLatestTool(threadId, runningTool);
            let interrupted = false;
            let resolveInterruptor = () => { };
            const interruptorPromise = new Promise(res => { resolveInterruptor = res; });
            try {
                // set stream state
                this._setStreamState(threadId, { isRunning: 'tool', interrupt: interruptorPromise, toolInfo: { toolName, toolParams, id: toolId, content: 'interrupted...', rawParams: opts.unvalidatedToolParams, mcpServerName } });
                if (isBuiltInTool) {
                    const { result, interruptTool } = await this._toolsService.callTool[toolName](toolParams);
                    const interruptor = () => { interrupted = true; interruptTool?.(); };
                    resolveInterruptor(interruptor);
                    toolResult = await result;
                }
                else {
                    const mcpTools = this._mcpService.getMCPTools();
                    const mcpTool = mcpTools?.find(t => t.name === toolName);
                    if (!mcpTool) {
                        throw new Error(`MCP tool ${toolName} not found`);
                    }
                    resolveInterruptor(() => { });
                    toolResult = (await this._mcpService.callMCPTool({
                        serverName: mcpTool.mcpServerName ?? 'unknown_mcp_server',
                        toolName: toolName,
                        params: toolParams
                    })).result;
                }
                if (interrupted) {
                    return { interrupted: true };
                } // the tool result is added where we interrupt, not here
            }
            catch (error) {
                resolveInterruptor(() => { }); // resolve for the sake of it
                if (interrupted) {
                    return { interrupted: true };
                } // the tool result is added where we interrupt, not here
                const errorMessage = getErrorMessage(error);
                this._updateLatestTool(threadId, { role: 'tool', type: 'tool_error', params: toolParams, result: errorMessage, name: toolName, content: errorMessage, id: toolId, rawParams: opts.unvalidatedToolParams, mcpServerName });
                return {};
            }
            // 4. stringify the result to give to the LLM
            try {
                if (isBuiltInTool) {
                    toolResultStr = this._toolsService.stringOfResult[toolName](toolParams, toolResult);
                }
                // For MCP tools, handle the result based on its type
                else {
                    toolResultStr = this._mcpService.stringifyResult(toolResult);
                }
            }
            catch (error) {
                const errorMessage = this.toolErrMsgs.errWhenStringifying(error);
                this._updateLatestTool(threadId, { role: 'tool', type: 'tool_error', params: toolParams, result: errorMessage, name: toolName, content: errorMessage, id: toolId, rawParams: opts.unvalidatedToolParams, mcpServerName });
                return {};
            }
            // 5. add to history and keep going
            this._updateLatestTool(threadId, { role: 'tool', type: 'success', params: toolParams, result: toolResult, name: toolName, content: toolResultStr, id: toolId, rawParams: opts.unvalidatedToolParams, mcpServerName });
            return {};
        };
        this._getCheckpointInfo = (checkpointMessage, fsPath, opts) => {
            const voidFileSnapshot = checkpointMessage.voidFileSnapshotOfURI ? checkpointMessage.voidFileSnapshotOfURI[fsPath] ?? null : null;
            if (!opts.includeUserModifiedChanges) {
                return { voidFileSnapshot, };
            }
            const userModifiedVoidFileSnapshot = fsPath in checkpointMessage.userModifications.voidFileSnapshotOfURI ? checkpointMessage.userModifications.voidFileSnapshotOfURI[fsPath] ?? null : null;
            return { voidFileSnapshot: userModifiedVoidFileSnapshot ?? voidFileSnapshot, };
        };
        this._getCheckpointBeforeMessage = ({ threadId, messageIdx }) => {
            const thread = this.state.allThreads[threadId];
            if (!thread)
                return undefined;
            for (let i = messageIdx; i >= 0; i--) {
                const message = thread.messages[i];
                if (message.role === 'checkpoint') {
                    return [message, i];
                }
            }
            return undefined;
        };
        this.editUserMessageAndStreamResponse = async ({ userMessage, messageIdx, threadId }) => {
            const thread = this.state.allThreads[threadId];
            if (!thread)
                return; // should never happen
            if (thread.messages?.[messageIdx]?.role !== 'user') {
                throw new Error(`Error: editing a message with role !=='user'`);
            }
            // get prev and curr selections before clearing the message
            const currSelns = thread.messages[messageIdx].state.stagingSelections || []; // staging selections for the edited message
            // clear messages up to the index
            const slicedMessages = thread.messages.slice(0, messageIdx);
            this._setState({
                allThreads: {
                    ...this.state.allThreads,
                    [thread.id]: {
                        ...thread,
                        messages: slicedMessages
                    }
                }
            });
            // re-add the message and stream it
            this._addUserMessageAndStreamResponse({ userMessage, _chatSelections: currSelns, threadId });
        };
        this.getRelativeStr = (uri) => {
            const isInside = this._workspaceContextService.isInsideWorkspace(uri);
            if (isInside) {
                const f = this._workspaceContextService.getWorkspace().folders.find(f => uri.fsPath.startsWith(f.uri.fsPath));
                if (f) {
                    return uri.fsPath.replace(f.uri.fsPath, '');
                }
                else {
                    return undefined;
                }
            }
            else {
                return undefined;
            }
        };
        // gets the location of codespan link so the user can click on it
        this.generateCodespanLink = async ({ codespanStr: _codespanStr, threadId }) => {
            // process codespan to understand what we are searching for
            // TODO account for more complicated patterns eg `ITextEditorService.openEditor()`
            const functionOrMethodPattern = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/; // `fUnCt10n_name`
            const functionParensPattern = /^([^\s(]+)\([^)]*\)$/; // `functionName( args )`
            let target = _codespanStr; // the string to search for
            let codespanType;
            if (target.includes('.') || target.includes('/')) {
                codespanType = 'file-or-folder';
                target = _codespanStr;
            }
            else if (functionOrMethodPattern.test(target)) {
                codespanType = 'function-or-class';
                target = _codespanStr;
            }
            else if (functionParensPattern.test(target)) {
                const match = target.match(functionParensPattern);
                if (match && match[1]) {
                    codespanType = 'function-or-class';
                    target = match[1];
                }
                else {
                    return null;
                }
            }
            else {
                return null;
            }
            // get history of all AI and user added files in conversation + store in reverse order (MRU)
            const prevUris = this._getAllSeenFileURIs(threadId).reverse();
            if (codespanType === 'file-or-folder') {
                const doesUriMatchTarget = (uri) => uri.path.includes(target);
                // check if any prevFiles are the `target`
                for (const [idx, uri] of prevUris.entries()) {
                    if (doesUriMatchTarget(uri)) {
                        // shorten it
                        // TODO make this logic more general
                        const prevUriStrs = prevUris.map(uri => uri.fsPath);
                        const shortenedUriStrs = shorten(prevUriStrs);
                        let displayText = shortenedUriStrs[idx];
                        const ellipsisIdx = displayText.lastIndexOf('…/');
                        if (ellipsisIdx >= 0) {
                            displayText = displayText.slice(ellipsisIdx + 2);
                        }
                        return { uri, displayText };
                    }
                }
                // else search codebase for `target`
                let uris = [];
                try {
                    const { result } = await this._toolsService.callTool['search_pathnames_only']({ query: target, includePattern: null, pageNumber: 0 });
                    const { uris: uris_ } = await result;
                    uris = uris_;
                }
                catch (e) {
                    return null;
                }
                for (const [idx, uri] of uris.entries()) {
                    if (doesUriMatchTarget(uri)) {
                        // TODO make this logic more general
                        const prevUriStrs = prevUris.map(uri => uri.fsPath);
                        const shortenedUriStrs = shorten(prevUriStrs);
                        let displayText = shortenedUriStrs[idx];
                        const ellipsisIdx = displayText.lastIndexOf('…/');
                        if (ellipsisIdx >= 0) {
                            displayText = displayText.slice(ellipsisIdx + 2);
                        }
                        return { uri, displayText };
                    }
                }
            }
            if (codespanType === 'function-or-class') {
                // check all prevUris for the target
                for (const uri of prevUris) {
                    const modelRef = await this._voidModelService.getModelSafe(uri);
                    const { model } = modelRef;
                    if (!model)
                        continue;
                    const matches = model.findMatches(target, false, // searchOnlyEditableRange
                    false, // isRegex
                    true, // matchCase
                    null, //' ',   // wordSeparators
                    true // captureMatches
                    );
                    const firstThree = matches.slice(0, 3);
                    // take first 3 occurences, attempt to goto definition on them
                    for (const match of firstThree) {
                        const position = new Position(match.range.startLineNumber, match.range.startColumn);
                        const definitionProviders = this._languageFeaturesService.definitionProvider.ordered(model);
                        for (const provider of definitionProviders) {
                            const _definitions = await provider.provideDefinition(model, position, CancellationToken.None);
                            if (!_definitions)
                                continue;
                            const definitions = Array.isArray(_definitions) ? _definitions : [_definitions];
                            for (const definition of definitions) {
                                return {
                                    uri: definition.uri,
                                    selection: {
                                        startLineNumber: definition.range.startLineNumber,
                                        startColumn: definition.range.startColumn,
                                        endLineNumber: definition.range.endLineNumber,
                                        endColumn: definition.range.endColumn,
                                    },
                                    displayText: _codespanStr,
                                };
                                // const defModelRef = await this._textModelService.createModelReference(definition.uri);
                                // const defModel = defModelRef.object.textEditorModel;
                                // try {
                                // 	const symbolProviders = this._languageFeaturesService.documentSymbolProvider.ordered(defModel);
                                // 	for (const symbolProvider of symbolProviders) {
                                // 		const symbols = await symbolProvider.provideDocumentSymbols(
                                // 			defModel,
                                // 			CancellationToken.None
                                // 		);
                                // 		if (symbols) {
                                // 			const symbol = symbols.find(s => {
                                // 				const symbolRange = s.range;
                                // 				return symbolRange.startLineNumber <= definition.range.startLineNumber &&
                                // 					symbolRange.endLineNumber >= definition.range.endLineNumber &&
                                // 					(symbolRange.startLineNumber !== definition.range.startLineNumber || symbolRange.startColumn <= definition.range.startColumn) &&
                                // 					(symbolRange.endLineNumber !== definition.range.endLineNumber || symbolRange.endColumn >= definition.range.endColumn);
                                // 			});
                                // 			// if we got to a class/function get the full range and return
                                // 			if (symbol?.kind === SymbolKind.Function || symbol?.kind === SymbolKind.Method || symbol?.kind === SymbolKind.Class) {
                                // 				return {
                                // 					uri: definition.uri,
                                // 					selection: {
                                // 						startLineNumber: definition.range.startLineNumber,
                                // 						startColumn: definition.range.startColumn,
                                // 						endLineNumber: definition.range.endLineNumber,
                                // 						endColumn: definition.range.endColumn,
                                // 					}
                                // 				};
                                // 			}
                                // 		}
                                // 	}
                                // } finally {
                                // 	defModelRef.dispose();
                                // }
                            }
                        }
                    }
                }
                // unlike above do not search codebase (doesnt make sense)
            }
            return null;
        };
        // closeCurrentStagingSelectionsInThread = () => {
        // 	const currThread = this.getCurrentThreadState()
        // 	// close all stagingSelections
        // 	const closedStagingSelections = currThread.stagingSelections.map(s => ({ ...s, state: { ...s.state, isOpened: false } }))
        // 	const newThread = currThread
        // 	newThread.stagingSelections = closedStagingSelections
        // 	this.setCurrentThreadState(newThread)
        // }
        // closeCurrentStagingSelectionsInMessage: IChatThreadService['closeCurrentStagingSelectionsInMessage'] = ({ messageIdx }) => {
        // 	const currMessage = this.getCurrentMessageState(messageIdx)
        // 	// close all stagingSelections
        // 	const closedStagingSelections = currMessage.stagingSelections.map(s => ({ ...s, state: { ...s.state, isOpened: false } }))
        // 	const newMessage = currMessage
        // 	newMessage.stagingSelections = closedStagingSelections
        // 	this.setCurrentMessageState(messageIdx, newMessage)
        // }
        this.getCurrentThreadState = () => {
            const currentThread = this.getCurrentThread();
            return currentThread.state;
        };
        this.setCurrentThreadState = (newState) => {
            this._setThreadState(this.state.currentThreadId, newState);
        };
        this.state = { allThreads: {}, currentThreadId: null }; // default state
        const readThreads = this._readAllThreads() || {};
        const allThreads = readThreads;
        this.state = {
            allThreads: allThreads,
            currentThreadId: null, // gets set in startNewThread()
        };
        // always be in a thread
        this.openNewThread();
        // keep track of user-modified files
        // const disposablesOfModelId: { [modelId: string]: IDisposable[] } = {}
        // this._register(
        // 	this._modelService.onModelAdded(e => {
        // 		if (!(e.id in disposablesOfModelId)) disposablesOfModelId[e.id] = []
        // 		disposablesOfModelId[e.id].push(
        // 			e.onDidChangeContent(() => { this._userModifiedFilesToCheckInCheckpoints.set(e.uri.fsPath, null) })
        // 		)
        // 	})
        // )
        // this._register(this._modelService.onModelRemoved(e => {
        // 	if (!(e.id in disposablesOfModelId)) return
        // 	disposablesOfModelId[e.id].forEach(d => d.dispose())
        // }))
    }
    async focusCurrentChat() {
        const threadId = this.state.currentThreadId;
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        const s = await thread.state.mountedInfo?.whenMounted;
        if (!this.isCurrentlyFocusingMessage()) {
            s?.textAreaRef.current?.focus();
        }
    }
    async blurCurrentChat() {
        const threadId = this.state.currentThreadId;
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        const s = await thread.state.mountedInfo?.whenMounted;
        if (!this.isCurrentlyFocusingMessage()) {
            s?.textAreaRef.current?.blur();
        }
    }
    // !!! this is important for properly restoring URIs from storage
    // should probably re-use code from void/src/vs/base/common/marshalling.ts instead. but this is simple enough
    _convertThreadDataFromStorage(threadsStr) {
        return JSON.parse(threadsStr, (key, value) => {
            if (value && typeof value === 'object' && value.$mid === 1) { // $mid is the MarshalledId. $mid === 1 means it is a URI
                return URI.from(value); // TODO URI.revive instead of this?
            }
            return value;
        });
    }
    _readAllThreads() {
        const threadsStr = this._storageService.get(THREAD_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
        if (!threadsStr) {
            return null;
        }
        const threads = this._convertThreadDataFromStorage(threadsStr);
        return threads;
    }
    _storeAllThreads(threads) {
        const serializedThreads = JSON.stringify(threads);
        this._storageService.store(THREAD_STORAGE_KEY, serializedThreads, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
    // this should be the only place this.state = ... appears besides constructor
    _setState(state, doNotRefreshMountInfo) {
        const newState = {
            ...this.state,
            ...state
        };
        this.state = newState;
        this._onDidChangeCurrentThread.fire();
        // if we just switched to a thread, update its current stream state if it's not streaming to possibly streaming
        const threadId = newState.currentThreadId;
        const streamState = this.streamState[threadId];
        if (streamState?.isRunning === undefined && !streamState?.error) {
            // set streamState
            const messages = newState.allThreads[threadId]?.messages;
            const lastMessage = messages && messages[messages.length - 1];
            // if awaiting user but stream state doesn't indicate it (happens if restart Void)
            if (lastMessage && lastMessage.role === 'tool' && lastMessage.type === 'tool_request')
                this._setStreamState(threadId, { isRunning: 'awaiting_user', });
            // if running now but stream state doesn't indicate it (happens if restart Void), cancel that last tool
            if (lastMessage && lastMessage.role === 'tool' && lastMessage.type === 'running_now') {
                this._updateLatestTool(threadId, { role: 'tool', type: 'rejected', content: lastMessage.content, id: lastMessage.id, rawParams: lastMessage.rawParams, result: null, name: lastMessage.name, params: lastMessage.params, mcpServerName: lastMessage.mcpServerName });
            }
        }
        // if we did not just set the state to true, set mount info
        if (doNotRefreshMountInfo)
            return;
        let whenMountedResolver;
        const whenMountedPromise = new Promise((res) => whenMountedResolver = res);
        this._setThreadState(threadId, {
            mountedInfo: {
                whenMounted: whenMountedPromise,
                mountedIsResolvedRef: { current: false },
                _whenMountedResolver: (w) => {
                    whenMountedResolver(w);
                    const mountInfo = this.state.allThreads[threadId]?.state.mountedInfo;
                    if (mountInfo)
                        mountInfo.mountedIsResolvedRef.current = true;
                },
            }
        }, true); // do not trigger an update
    }
    _setStreamState(threadId, state) {
        this.streamState[threadId] = state;
        this._onDidChangeStreamState.fire({ threadId });
    }
    approveLatestToolRequest(threadId) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return; // should never happen
        const lastMsg = thread.messages[thread.messages.length - 1];
        if (!(lastMsg.role === 'tool' && lastMsg.type === 'tool_request'))
            return; // should never happen
        const callThisToolFirst = lastMsg;
        this._wrapRunAgentToNotify(this._runChatAgent({ callThisToolFirst, threadId, ...this._currentModelSelectionProps() }), threadId);
    }
    rejectLatestToolRequest(threadId) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return; // should never happen
        const lastMsg = thread.messages[thread.messages.length - 1];
        let params;
        if (lastMsg.role === 'tool' && lastMsg.type !== 'invalid_params') {
            params = lastMsg.params;
        }
        else
            return;
        const { name, id, rawParams, mcpServerName } = lastMsg;
        const errorMessage = this.toolErrMsgs.rejected;
        this._updateLatestTool(threadId, { role: 'tool', type: 'rejected', params: params, name: name, content: errorMessage, result: null, id, rawParams, mcpServerName });
        this._setStreamState(threadId, undefined);
    }
    async abortRunning(threadId) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return; // should never happen
        // add assistant message
        if (this.streamState[threadId]?.isRunning === 'LLM') {
            const { displayContentSoFar, reasoningSoFar, toolCallSoFar } = this.streamState[threadId].llmInfo;
            this._addMessageToThread(threadId, { role: 'assistant', displayContent: displayContentSoFar, reasoning: reasoningSoFar, anthropicReasoning: null });
            if (toolCallSoFar)
                this._addMessageToThread(threadId, { role: 'interrupted_streaming_tool', name: toolCallSoFar.name, mcpServerName: this._computeMCPServerOfToolName(toolCallSoFar.name) });
        }
        // add tool that's running
        else if (this.streamState[threadId]?.isRunning === 'tool') {
            const { toolName, toolParams, id, content: content_, rawParams, mcpServerName } = this.streamState[threadId].toolInfo;
            const content = content_ || this.toolErrMsgs.interrupted;
            this._updateLatestTool(threadId, { role: 'tool', name: toolName, params: toolParams, id, content, rawParams, type: 'rejected', result: null, mcpServerName });
        }
        // reject the tool for the user if relevant
        else if (this.streamState[threadId]?.isRunning === 'awaiting_user') {
            this.rejectLatestToolRequest(threadId);
        }
        else if (this.streamState[threadId]?.isRunning === 'idle') {
            // do nothing
        }
        this._addUserCheckpoint({ threadId });
        // interrupt any effects
        const interrupt = await this.streamState[threadId]?.interrupt;
        if (typeof interrupt === 'function')
            interrupt();
        this._setStreamState(threadId, undefined);
    }
    async _runChatAgent({ threadId, modelSelection, modelSelectionOptions, callThisToolFirst, }) {
        let interruptedWhenIdle = false;
        const idleInterruptor = Promise.resolve(() => { interruptedWhenIdle = true; });
        // _runToolCall does not need setStreamState({idle}) before it, but it needs it after it. (handles its own setStreamState)
        // above just defines helpers, below starts the actual function
        const { chatMode } = this._settingsService.state.globalSettings; // should not change as we loop even if user changes it, so it goes here
        const { overridesOfModel } = this._settingsService.state;
        let nMessagesSent = 0;
        let shouldSendAnotherMessage = true;
        let isRunningWhenEnd = undefined;
        // before enter loop, call tool
        if (callThisToolFirst) {
            const { interrupted } = await this._runToolCall(threadId, callThisToolFirst.name, callThisToolFirst.id, callThisToolFirst.mcpServerName, { preapproved: true, unvalidatedToolParams: callThisToolFirst.rawParams, validatedParams: callThisToolFirst.params });
            if (interrupted) {
                this._setStreamState(threadId, undefined);
                this._addUserCheckpoint({ threadId });
            }
        }
        this._setStreamState(threadId, { isRunning: 'idle', interrupt: 'not_needed' }); // just decorative, for clarity
        // tool use loop
        while (shouldSendAnotherMessage) {
            // false by default each iteration
            shouldSendAnotherMessage = false;
            isRunningWhenEnd = undefined;
            nMessagesSent += 1;
            this._setStreamState(threadId, { isRunning: 'idle', interrupt: idleInterruptor });
            const chatMessages = this.state.allThreads[threadId]?.messages ?? [];
            const { messages, separateSystemMessage } = await this._convertToLLMMessagesService.prepareLLMChatMessages({
                chatMessages,
                modelSelection,
                chatMode
            });
            if (interruptedWhenIdle) {
                this._setStreamState(threadId, undefined);
                return;
            }
            let shouldRetryLLM = true;
            let nAttempts = 0;
            while (shouldRetryLLM) {
                shouldRetryLLM = false;
                nAttempts += 1;
                let resMessageIsDonePromise; // resolves when user approves this tool use (or if tool doesn't require approval)
                const messageIsDonePromise = new Promise((res, rej) => { resMessageIsDonePromise = res; });
                const llmCancelToken = this._llmMessageService.sendLLMMessage({
                    messagesType: 'chatMessages',
                    chatMode,
                    messages: messages,
                    modelSelection,
                    modelSelectionOptions,
                    overridesOfModel,
                    logging: { loggingName: `Chat - ${chatMode}`, loggingExtras: { threadId, nMessagesSent, chatMode } },
                    separateSystemMessage: separateSystemMessage,
                    onText: ({ fullText, fullReasoning, toolCall }) => {
                        this._setStreamState(threadId, { isRunning: 'LLM', llmInfo: { displayContentSoFar: fullText, reasoningSoFar: fullReasoning, toolCallSoFar: toolCall ?? null }, interrupt: Promise.resolve(() => { if (llmCancelToken)
                                this._llmMessageService.abort(llmCancelToken); }) });
                    },
                    onFinalMessage: async ({ fullText, fullReasoning, toolCall, anthropicReasoning, }) => {
                        resMessageIsDonePromise({ type: 'llmDone', toolCall, info: { fullText, fullReasoning, anthropicReasoning } }); // resolve with tool calls
                    },
                    onError: async (error) => {
                        resMessageIsDonePromise({ type: 'llmError', error: error });
                    },
                    onAbort: () => {
                        // stop the loop to free up the promise, but don't modify state (already handled by whatever stopped it)
                        resMessageIsDonePromise({ type: 'llmAborted' });
                        this._metricsService.capture('Agent Loop Done (Aborted)', { nMessagesSent, chatMode });
                    },
                });
                // mark as streaming
                if (!llmCancelToken) {
                    this._setStreamState(threadId, { isRunning: undefined, error: { message: 'There was an unexpected error when sending your chat message.', fullError: null } });
                    break;
                }
                this._setStreamState(threadId, { isRunning: 'LLM', llmInfo: { displayContentSoFar: '', reasoningSoFar: '', toolCallSoFar: null }, interrupt: Promise.resolve(() => this._llmMessageService.abort(llmCancelToken)) });
                const llmRes = await messageIsDonePromise; // wait for message to complete
                // if something else started running in the meantime
                if (this.streamState[threadId]?.isRunning !== 'LLM') {
                    // console.log('Chat thread interrupted by a newer chat thread', this.streamState[threadId]?.isRunning)
                    return;
                }
                // llm res aborted
                if (llmRes.type === 'llmAborted') {
                    this._setStreamState(threadId, undefined);
                    return;
                }
                // llm res error
                else if (llmRes.type === 'llmError') {
                    // error, should retry
                    if (nAttempts < CHAT_RETRIES) {
                        shouldRetryLLM = true;
                        this._setStreamState(threadId, { isRunning: 'idle', interrupt: idleInterruptor });
                        await timeout(RETRY_DELAY);
                        if (interruptedWhenIdle) {
                            this._setStreamState(threadId, undefined);
                            return;
                        }
                        else
                            continue; // retry
                    }
                    // error, but too many attempts
                    else {
                        const { error } = llmRes;
                        const { displayContentSoFar, reasoningSoFar, toolCallSoFar } = this.streamState[threadId].llmInfo;
                        this._addMessageToThread(threadId, { role: 'assistant', displayContent: displayContentSoFar, reasoning: reasoningSoFar, anthropicReasoning: null });
                        if (toolCallSoFar)
                            this._addMessageToThread(threadId, { role: 'interrupted_streaming_tool', name: toolCallSoFar.name, mcpServerName: this._computeMCPServerOfToolName(toolCallSoFar.name) });
                        this._setStreamState(threadId, { isRunning: undefined, error });
                        this._addUserCheckpoint({ threadId });
                        return;
                    }
                }
                // llm res success
                const { toolCall, info } = llmRes;
                this._addMessageToThread(threadId, { role: 'assistant', displayContent: info.fullText, reasoning: info.fullReasoning, anthropicReasoning: info.anthropicReasoning });
                this._setStreamState(threadId, { isRunning: 'idle', interrupt: 'not_needed' }); // just decorative for clarity
                // call tool if there is one
                if (toolCall) {
                    const mcpTools = this._mcpService.getMCPTools();
                    const mcpTool = mcpTools?.find(t => t.name === toolCall.name);
                    const { awaitingUserApproval, interrupted } = await this._runToolCall(threadId, toolCall.name, toolCall.id, mcpTool?.mcpServerName, { preapproved: false, unvalidatedToolParams: toolCall.rawParams });
                    if (interrupted) {
                        this._setStreamState(threadId, undefined);
                        return;
                    }
                    if (awaitingUserApproval) {
                        isRunningWhenEnd = 'awaiting_user';
                    }
                    else {
                        shouldSendAnotherMessage = true;
                    }
                    this._setStreamState(threadId, { isRunning: 'idle', interrupt: 'not_needed' }); // just decorative, for clarity
                }
            } // end while (attempts)
        } // end while (send message)
        // if awaiting user approval, keep isRunning true, else end isRunning
        this._setStreamState(threadId, { isRunning: isRunningWhenEnd });
        // add checkpoint before the next user message
        if (!isRunningWhenEnd)
            this._addUserCheckpoint({ threadId });
        // capture number of messages sent
        this._metricsService.capture('Agent Loop Done', { nMessagesSent, chatMode });
    }
    _addCheckpoint(threadId, checkpoint) {
        this._addMessageToThread(threadId, checkpoint);
        // // update latest checkpoint idx to the one we just added
        // const newThread = this.state.allThreads[threadId]
        // if (!newThread) return // should never happen
        // const currCheckpointIdx = newThread.messages.length - 1
        // this._setThreadState(threadId, { currCheckpointIdx: currCheckpointIdx })
    }
    _editMessageInThread(threadId, messageIdx, newMessage) {
        const { allThreads } = this.state;
        const oldThread = allThreads[threadId];
        if (!oldThread)
            return; // should never happen
        // update state and store it
        const newThreads = {
            ...allThreads,
            [oldThread.id]: {
                ...oldThread,
                lastModified: new Date().toISOString(),
                messages: [
                    ...oldThread.messages.slice(0, messageIdx),
                    newMessage,
                    ...oldThread.messages.slice(messageIdx + 1, Infinity),
                ],
            }
        };
        this._storeAllThreads(newThreads);
        this._setState({ allThreads: newThreads }); // the current thread just changed (it had a message added to it)
    }
    _computeNewCheckpointInfo({ threadId }) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        const lastCheckpointIdx = findLastIdx(thread.messages, (m) => m.role === 'checkpoint') ?? -1;
        if (lastCheckpointIdx === -1)
            return;
        const voidFileSnapshotOfURI = {};
        // add a change for all the URIs in the checkpoint history
        const { lastIdxOfURI } = this._getCheckpointsBetween({ threadId, loIdx: 0, hiIdx: lastCheckpointIdx, }) ?? {};
        for (const fsPath in lastIdxOfURI ?? {}) {
            const { model } = this._voidModelService.getModelFromFsPath(fsPath);
            if (!model)
                continue;
            const checkpoint2 = thread.messages[lastIdxOfURI[fsPath]] || null;
            if (!checkpoint2)
                continue;
            if (checkpoint2.role !== 'checkpoint')
                continue;
            const res = this._getCheckpointInfo(checkpoint2, fsPath, { includeUserModifiedChanges: false });
            if (!res)
                continue;
            const { voidFileSnapshot: oldVoidFileSnapshot } = res;
            // if there was any change to the str or diffAreaSnapshot, update. rough approximation of equality, oldDiffAreasSnapshot === diffAreasSnapshot is not perfect
            const voidFileSnapshot = this._editCodeService.getVoidFileSnapshot(URI.file(fsPath));
            if (oldVoidFileSnapshot === voidFileSnapshot)
                continue;
            voidFileSnapshotOfURI[fsPath] = voidFileSnapshot;
        }
        // // add a change for all user-edited files (that aren't in the history)
        // for (const fsPath of this._userModifiedFilesToCheckInCheckpoints.keys()) {
        // 	if (fsPath in lastIdxOfURI) continue // if already visisted, don't visit again
        // 	const { model } = this._voidModelService.getModelFromFsPath(fsPath)
        // 	if (!model) continue
        // 	currStrOfFsPath[fsPath] = model.getValue(EndOfLinePreference.LF)
        // }
        return { voidFileSnapshotOfURI };
    }
    _addUserCheckpoint({ threadId }) {
        const { voidFileSnapshotOfURI } = this._computeNewCheckpointInfo({ threadId }) ?? {};
        this._addCheckpoint(threadId, {
            role: 'checkpoint',
            type: 'user_edit',
            voidFileSnapshotOfURI: voidFileSnapshotOfURI ?? {},
            userModifications: { voidFileSnapshotOfURI: {}, },
        });
    }
    // call this right after LLM edits a file
    _addToolEditCheckpoint({ threadId, uri, }) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        const { model } = this._voidModelService.getModel(uri);
        if (!model)
            return; // should never happen
        const diffAreasSnapshot = this._editCodeService.getVoidFileSnapshot(uri);
        this._addCheckpoint(threadId, {
            role: 'checkpoint',
            type: 'tool_edit',
            voidFileSnapshotOfURI: { [uri.fsPath]: diffAreasSnapshot },
            userModifications: { voidFileSnapshotOfURI: {} },
        });
    }
    _getCheckpointsBetween({ threadId, loIdx, hiIdx }) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return { lastIdxOfURI: {} }; // should never happen
        const lastIdxOfURI = {};
        for (let i = loIdx; i <= hiIdx; i += 1) {
            const message = thread.messages[i];
            if (message?.role !== 'checkpoint')
                continue;
            for (const fsPath in message.voidFileSnapshotOfURI) { // do not include userModified.beforeStrOfURI here, jumping should not include those changes
                lastIdxOfURI[fsPath] = i;
            }
        }
        return { lastIdxOfURI };
    }
    _readCurrentCheckpoint(threadId) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        const { currCheckpointIdx } = thread.state;
        if (currCheckpointIdx === null)
            return;
        const checkpoint = thread.messages[currCheckpointIdx];
        if (!checkpoint)
            return;
        if (checkpoint.role !== 'checkpoint')
            return;
        return [checkpoint, currCheckpointIdx];
    }
    _addUserModificationsToCurrCheckpoint({ threadId }) {
        const { voidFileSnapshotOfURI } = this._computeNewCheckpointInfo({ threadId }) ?? {};
        const res = this._readCurrentCheckpoint(threadId);
        if (!res)
            return;
        const [checkpoint, checkpointIdx] = res;
        this._editMessageInThread(threadId, checkpointIdx, {
            ...checkpoint,
            userModifications: { voidFileSnapshotOfURI: voidFileSnapshotOfURI ?? {}, },
        });
    }
    _makeUsStandOnCheckpoint({ threadId }) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        if (thread.state.currCheckpointIdx === null) {
            const lastMsg = thread.messages[thread.messages.length - 1];
            if (lastMsg?.role !== 'checkpoint')
                this._addUserCheckpoint({ threadId });
            this._setThreadState(threadId, { currCheckpointIdx: thread.messages.length - 1 });
        }
    }
    jumpToCheckpointBeforeMessageIdx({ threadId, messageIdx, jumpToUserModified }) {
        // if null, add a new temp checkpoint so user can jump forward again
        this._makeUsStandOnCheckpoint({ threadId });
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        if (this.streamState[threadId]?.isRunning)
            return;
        const c = this._getCheckpointBeforeMessage({ threadId, messageIdx });
        if (c === undefined)
            return; // should never happen
        const fromIdx = thread.state.currCheckpointIdx;
        if (fromIdx === null)
            return; // should never happen
        const [_, toIdx] = c;
        if (toIdx === fromIdx)
            return;
        // console.log(`going from ${fromIdx} to ${toIdx}`)
        // update the user's checkpoint
        this._addUserModificationsToCurrCheckpoint({ threadId });
        /*
if undoing

A,B,C are all files.
x means a checkpoint where the file changed.

A B C D E F G H I
  x x x x x   x           <-- you can't always go up to find the "before" version; sometimes you need to go down
  | | | | |   | x
--x-|-|-|-x---x-|-----     <-- to
    | | | | x   x
    | | x x |
    | |   | |
----x-|---x-x-------     <-- from
      x

We need to revert anything that happened between to+1 and from.
**We do this by finding the last x from 0...`to` for each file and applying those contents.**
We only need to do it for files that were edited since `to`, ie files between to+1...from.
*/
        if (toIdx < fromIdx) {
            const { lastIdxOfURI } = this._getCheckpointsBetween({ threadId, loIdx: toIdx + 1, hiIdx: fromIdx });
            const idxes = function* () {
                for (let k = toIdx; k >= 0; k -= 1) { // first go up
                    yield k;
                }
                for (let k = toIdx + 1; k < thread.messages.length; k += 1) { // then go down
                    yield k;
                }
            };
            for (const fsPath in lastIdxOfURI) {
                // find the first instance of this file starting at toIdx (go up to latest file; if there is none, go down)
                for (const k of idxes()) {
                    const message = thread.messages[k];
                    if (message.role !== 'checkpoint')
                        continue;
                    const res = this._getCheckpointInfo(message, fsPath, { includeUserModifiedChanges: jumpToUserModified });
                    if (!res)
                        continue;
                    const { voidFileSnapshot } = res;
                    if (!voidFileSnapshot)
                        continue;
                    this._editCodeService.restoreVoidFileSnapshot(URI.file(fsPath), voidFileSnapshot);
                    break;
                }
            }
        }
        /*
if redoing

A B C D E F G H I J
  x x x x x   x     x
  | | | | |   | x x x
--x-|-|-|-x---x-|-|---     <-- from
    | | | | x   x
    | | x x |
    | |   | |
----x-|---x-x-----|---     <-- to
      x           x


We need to apply latest change for anything that happened between from+1 and to.
We only need to do it for files that were edited since `from`, ie files between from+1...to.
*/
        if (toIdx > fromIdx) {
            const { lastIdxOfURI } = this._getCheckpointsBetween({ threadId, loIdx: fromIdx + 1, hiIdx: toIdx });
            for (const fsPath in lastIdxOfURI) {
                // apply lowest down content for each uri
                for (let k = toIdx; k >= fromIdx + 1; k -= 1) {
                    const message = thread.messages[k];
                    if (message.role !== 'checkpoint')
                        continue;
                    const res = this._getCheckpointInfo(message, fsPath, { includeUserModifiedChanges: jumpToUserModified });
                    if (!res)
                        continue;
                    const { voidFileSnapshot } = res;
                    if (!voidFileSnapshot)
                        continue;
                    this._editCodeService.restoreVoidFileSnapshot(URI.file(fsPath), voidFileSnapshot);
                    break;
                }
            }
        }
        this._setThreadState(threadId, { currCheckpointIdx: toIdx });
    }
    _wrapRunAgentToNotify(p, threadId) {
        const notify = ({ error }) => {
            const thread = this.state.allThreads[threadId];
            if (!thread)
                return;
            const userMsg = findLast(thread.messages, m => m.role === 'user');
            if (!userMsg)
                return;
            if (userMsg.role !== 'user')
                return;
            const messageContent = truncate(userMsg.displayContent, 50, '...');
            this._notificationService.notify({
                severity: error ? Severity.Warning : Severity.Info,
                message: error ? `Error: ${error} ` : `A new Chat result is ready.`,
                source: messageContent,
                sticky: true,
                actions: {
                    primary: [{
                            id: 'void.goToChat',
                            enabled: true,
                            label: `Jump to Chat`,
                            tooltip: '',
                            class: undefined,
                            run: () => {
                                this.switchToThread(threadId);
                                // scroll to bottom
                                this.state.allThreads[threadId]?.state.mountedInfo?.whenMounted.then(m => {
                                    m.scrollToBottom();
                                });
                            }
                        }]
                },
            });
        };
        p.then(() => {
            if (threadId !== this.state.currentThreadId)
                notify({ error: null });
        }).catch((e) => {
            if (threadId !== this.state.currentThreadId)
                notify({ error: getErrorMessage(e) });
            throw e;
        });
    }
    dismissStreamError(threadId) {
        this._setStreamState(threadId, undefined);
    }
    async _addUserMessageAndStreamResponse({ userMessage, _chatSelections, threadId }) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return; // should never happen
        // interrupt existing stream
        if (this.streamState[threadId]?.isRunning) {
            await this.abortRunning(threadId);
        }
        // add dummy before this message to keep checkpoint before user message idea consistent
        if (thread.messages.length === 0) {
            this._addUserCheckpoint({ threadId });
        }
        // add user's message to chat history
        const instructions = userMessage;
        const currSelns = _chatSelections ?? thread.state.stagingSelections;
        const userMessageContent = await chat_userMessageContent(instructions, currSelns, { directoryStrService: this._directoryStringService, fileService: this._fileService }); // user message + names of files (NOT content)
        const userHistoryElt = { role: 'user', content: userMessageContent, displayContent: instructions, selections: currSelns, state: defaultMessageState };
        this._addMessageToThread(threadId, userHistoryElt);
        this._setThreadState(threadId, { currCheckpointIdx: null }); // no longer at a checkpoint because started streaming
        this._wrapRunAgentToNotify(this._runChatAgent({ threadId, ...this._currentModelSelectionProps(), }), threadId);
        // scroll to bottom
        this.state.allThreads[threadId]?.state.mountedInfo?.whenMounted.then(m => {
            m.scrollToBottom();
        });
    }
    async addUserMessageAndStreamResponse({ userMessage, _chatSelections, threadId }) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        // if there's a current checkpoint, delete all messages after it
        if (thread.state.currCheckpointIdx !== null) {
            const checkpointIdx = thread.state.currCheckpointIdx;
            const newMessages = thread.messages.slice(0, checkpointIdx + 1);
            // Update the thread with truncated messages
            const newThreads = {
                ...this.state.allThreads,
                [threadId]: {
                    ...thread,
                    lastModified: new Date().toISOString(),
                    messages: newMessages,
                }
            };
            this._storeAllThreads(newThreads);
            this._setState({ allThreads: newThreads });
        }
        // Now call the original method to add the user message and stream the response
        await this._addUserMessageAndStreamResponse({ userMessage, _chatSelections, threadId });
    }
    // ---------- the rest ----------
    _getAllSeenFileURIs(threadId) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return [];
        const fsPathsSet = new Set();
        const uris = [];
        const addURI = (uri) => {
            if (!fsPathsSet.has(uri.fsPath))
                uris.push(uri);
            fsPathsSet.add(uri.fsPath);
            uris.push(uri);
        };
        for (const m of thread.messages) {
            // URIs of user selections
            if (m.role === 'user') {
                for (const sel of m.selections ?? []) {
                    addURI(sel.uri);
                }
            }
            // URIs of files that have been read
            else if (m.role === 'tool' && m.type === 'success' && m.name === 'read_file') {
                const params = m.params;
                addURI(params.uri);
            }
        }
        return uris;
    }
    getCodespanLink({ codespanStr, messageIdx, threadId }) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return undefined;
        const links = thread.state.linksOfMessageIdx?.[messageIdx];
        if (!links)
            return undefined;
        const link = links[codespanStr];
        return link;
    }
    async addCodespanLink({ newLinkText, newLinkLocation, messageIdx, threadId }) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        this._setState({
            allThreads: {
                ...this.state.allThreads,
                [threadId]: {
                    ...thread,
                    state: {
                        ...thread.state,
                        linksOfMessageIdx: {
                            ...thread.state.linksOfMessageIdx,
                            [messageIdx]: {
                                ...thread.state.linksOfMessageIdx?.[messageIdx],
                                [newLinkText]: newLinkLocation
                            }
                        }
                    }
                }
            }
        });
    }
    getCurrentThread() {
        const state = this.state;
        const thread = state.allThreads[state.currentThreadId];
        if (!thread)
            throw new Error(`Current thread should never be undefined`);
        return thread;
    }
    getCurrentFocusedMessageIdx() {
        const thread = this.getCurrentThread();
        // get the focusedMessageIdx
        const focusedMessageIdx = thread.state.focusedMessageIdx;
        if (focusedMessageIdx === undefined)
            return;
        // check that the message is actually being edited
        const focusedMessage = thread.messages[focusedMessageIdx];
        if (focusedMessage.role !== 'user')
            return;
        if (!focusedMessage.state)
            return;
        return focusedMessageIdx;
    }
    isCurrentlyFocusingMessage() {
        return this.getCurrentFocusedMessageIdx() !== undefined;
    }
    switchToThread(threadId) {
        this._setState({ currentThreadId: threadId });
    }
    openNewThread() {
        // if a thread with 0 messages already exists, switch to it
        const { allThreads: currentThreads } = this.state;
        for (const threadId in currentThreads) {
            if (currentThreads[threadId].messages.length === 0) {
                // switch to the existing empty thread and exit
                this.switchToThread(threadId);
                return;
            }
        }
        // otherwise, start a new thread
        const newThread = newThreadObject();
        // update state
        const newThreads = {
            ...currentThreads,
            [newThread.id]: newThread
        };
        this._storeAllThreads(newThreads);
        this._setState({ allThreads: newThreads, currentThreadId: newThread.id });
    }
    deleteThread(threadId) {
        const { allThreads: currentThreads } = this.state;
        // delete the thread
        const newThreads = { ...currentThreads };
        delete newThreads[threadId];
        // store the updated threads
        this._storeAllThreads(newThreads);
        this._setState({ ...this.state, allThreads: newThreads });
    }
    duplicateThread(threadId) {
        const { allThreads: currentThreads } = this.state;
        const threadToDuplicate = currentThreads[threadId];
        if (!threadToDuplicate)
            return;
        const newThread = {
            ...deepClone(threadToDuplicate),
            id: generateUuid(),
        };
        const newThreads = {
            ...currentThreads,
            [newThread.id]: newThread,
        };
        this._storeAllThreads(newThreads);
        this._setState({ allThreads: newThreads });
    }
    _addMessageToThread(threadId, message) {
        const { allThreads } = this.state;
        const oldThread = allThreads[threadId];
        if (!oldThread)
            return; // should never happen
        // update state and store it
        const newThreads = {
            ...allThreads,
            [oldThread.id]: {
                ...oldThread,
                lastModified: new Date().toISOString(),
                messages: [
                    ...oldThread.messages,
                    message
                ],
            }
        };
        this._storeAllThreads(newThreads);
        this._setState({ allThreads: newThreads }); // the current thread just changed (it had a message added to it)
    }
    // sets the currently selected message (must be undefined if no message is selected)
    setCurrentlyFocusedMessageIdx(messageIdx) {
        const threadId = this.state.currentThreadId;
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        this._setState({
            allThreads: {
                ...this.state.allThreads,
                [threadId]: {
                    ...thread,
                    state: {
                        ...thread.state,
                        focusedMessageIdx: messageIdx,
                    }
                }
            }
        });
        // // when change focused message idx, jump - do not jump back when click edit, too confusing.
        // if (messageIdx !== undefined)
        // 	this.jumpToCheckpointBeforeMessageIdx({ threadId, messageIdx, jumpToUserModified: true })
    }
    addNewStagingSelection(newSelection) {
        const focusedMessageIdx = this.getCurrentFocusedMessageIdx();
        // set the selections to the proper value
        let selections = [];
        let setSelections = (s) => { };
        if (focusedMessageIdx === undefined) {
            selections = this.getCurrentThreadState().stagingSelections;
            setSelections = (s) => this.setCurrentThreadState({ stagingSelections: s });
        }
        else {
            selections = this.getCurrentMessageState(focusedMessageIdx).stagingSelections;
            setSelections = (s) => this.setCurrentMessageState(focusedMessageIdx, { stagingSelections: s });
        }
        // if matches with existing selection, overwrite (since text may change)
        const idx = findStagingSelectionIndex(selections, newSelection);
        if (idx !== null && idx !== -1) {
            setSelections([
                ...selections.slice(0, idx),
                newSelection,
                ...selections.slice(idx + 1, Infinity)
            ]);
        }
        // if no match, add it
        else {
            setSelections([...(selections ?? []), newSelection]);
        }
    }
    // Pops the staging selections from the current thread's state
    popStagingSelections(numPops) {
        numPops = numPops ?? 1;
        const focusedMessageIdx = this.getCurrentFocusedMessageIdx();
        // set the selections to the proper value
        let selections = [];
        let setSelections = (s) => { };
        if (focusedMessageIdx === undefined) {
            selections = this.getCurrentThreadState().stagingSelections;
            setSelections = (s) => this.setCurrentThreadState({ stagingSelections: s });
        }
        else {
            selections = this.getCurrentMessageState(focusedMessageIdx).stagingSelections;
            setSelections = (s) => this.setCurrentMessageState(focusedMessageIdx, { stagingSelections: s });
        }
        setSelections([
            ...selections.slice(0, selections.length - numPops)
        ]);
    }
    // set message.state
    _setCurrentMessageState(state, messageIdx) {
        const threadId = this.state.currentThreadId;
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        this._setState({
            allThreads: {
                ...this.state.allThreads,
                [threadId]: {
                    ...thread,
                    messages: thread.messages.map((m, i) => i === messageIdx && m.role === 'user' ? {
                        ...m,
                        state: {
                            ...m.state,
                            ...state
                        },
                    } : m)
                }
            }
        });
    }
    // set thread.state
    _setThreadState(threadId, state, doNotRefreshMountInfo) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        this._setState({
            allThreads: {
                ...this.state.allThreads,
                [thread.id]: {
                    ...thread,
                    state: {
                        ...thread.state,
                        ...state
                    }
                }
            }
        }, doNotRefreshMountInfo);
    }
    // gets `staging` and `setStaging` of the currently focused element, given the index of the currently selected message (or undefined if no message is selected)
    getCurrentMessageState(messageIdx) {
        const currMessage = this.getCurrentThread()?.messages?.[messageIdx];
        if (!currMessage || currMessage.role !== 'user')
            return defaultMessageState;
        return currMessage.state;
    }
    setCurrentMessageState(messageIdx, newState) {
        const currMessage = this.getCurrentThread()?.messages?.[messageIdx];
        if (!currMessage || currMessage.role !== 'user')
            return;
        this._setCurrentMessageState(newState, messageIdx);
    }
};
ChatThreadService = __decorate([
    __param(0, IStorageService),
    __param(1, IVoidModelService),
    __param(2, ILLMMessageService),
    __param(3, IToolsService),
    __param(4, IVoidSettingsService),
    __param(5, ILanguageFeaturesService),
    __param(6, IMetricsService),
    __param(7, IEditCodeService),
    __param(8, INotificationService),
    __param(9, IConvertToLLMMessageService),
    __param(10, IWorkspaceContextService),
    __param(11, IDirectoryStrService),
    __param(12, IFileService),
    __param(13, IMCPService)
], ChatThreadService);
registerSingleton(IChatThreadService, ChatThreadService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRocmVhZFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL2NoYXRUaHJlYWRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFFOUcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMxRixPQUFPLEVBQXNCLGVBQWUsRUFBb0MsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6SCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFL0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDeEUsT0FBTyxFQUFFLDZCQUE2QixFQUErRCxNQUFNLGdDQUFnQyxDQUFDO0FBQzVJLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFB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