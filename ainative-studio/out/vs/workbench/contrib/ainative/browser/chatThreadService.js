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
import { IAINativeSettingsService } from '../common/ainativeSettingsService.js';
import { approvalTypeOfBuiltinToolName } from '../common/toolsServiceTypes.js';
import { IToolsService } from './toolsService.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { Position } from '../../../../editor/common/core/position.js';
import { IMetricsService } from '../common/metricsService.js';
import { shorten } from '../../../../base/common/labels.js';
import { IAINativeModelService } from '../common/ainativeModelService.js';
import { findLast, findLastIdx } from '../../../../base/common/arraysFind.js';
import { IEditCodeService } from './editCodeServiceInterface.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { truncate } from '../../../../base/common/strings.js';
import { THREAD_STORAGE_KEY, LEGACY_THREAD_STORAGE_KEY } from '../common/storageKeys.js';
import { IConvertToLLMMessageService } from './convertToLLMMessageService.js';
import { timeout } from '../../../../base/common/async.js';
import { deepClone } from '../../../../base/common/objects.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IDirectoryStrService } from '../common/directoryStrService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IMCPService } from '../common/mcpService.js';
import { IManagedChatAPIService, ManagedChatAPIError } from '../common/managedChatAPIService.js';
import { ICodeIntelligenceService } from '../common/codeIntelligenceService.js';
import { IWebFetchService } from '../common/webFetchService.js';
import { IUsageTrackingService } from '../common/usageTrackingService.js';
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
export const IChatThreadService = createDecorator('ainativeChatThreadService');
let ChatThreadService = class ChatThreadService extends Disposable {
    // used in checkpointing
    // private readonly _userModifiedFilesToCheckInCheckpoints = new LRUCache<string, null>(50)
    constructor(_storageService, _voidModelService, _llmMessageService, _toolsService, _settingsService, _languageFeaturesService, _metricsService, _editCodeService, _notificationService, _convertToLLMMessagesService, _workspaceContextService, _directoryStringService, _fileService, _mcpService, _managedChatAPI, _codeIntelligenceService, _webFetchService, _usageTrackingService) {
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
        this._managedChatAPI = _managedChatAPI;
        this._codeIntelligenceService = _codeIntelligenceService;
        this._webFetchService = _webFetchService;
        this._usageTrackingService = _usageTrackingService;
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
    /**
     * Migrate chat threads from legacy 'void.chatThreadStorageII' to 'ainative.chatThreadStorageII'
     */
    _migrateChatThreads() {
        // Check if new key already exists
        const newKeyData = this._storageService.get(THREAD_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
        if (newKeyData !== undefined) {
            return; // Already migrated
        }
        // Read from legacy key
        const legacyData = this._storageService.get(LEGACY_THREAD_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
        if (legacyData === undefined) {
            return; // No legacy data to migrate
        }
        // Migrate
        this._storageService.store(THREAD_STORAGE_KEY, legacyData, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        this._storageService.remove(LEGACY_THREAD_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
        console.log('[AINative Migration] Successfully migrated chat threads from void.chatThreadStorageII to ainative.chatThreadStorageII');
    }
    _readAllThreads() {
        // Migrate from legacy storage key if needed
        this._migrateChatThreads();
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
                            id: 'ainative.goToChat',
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
    // ========== MANAGED API INTEGRATION ==========
    /**
     * Send message using managed API with tool calling
     * This is an alternative to the regular BYOK chat flow
     */
    async sendMessageWithManagedAPI(userMessage, threadId, useStreaming = true, context) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        try {
            // Select tools based on context
            const tools = this._selectToolsForContext(userMessage, context);
            // Convert chat messages to managed API format
            const messages = this._convertToManagedAPIMessages(thread.messages);
            // Add the new user message
            messages.push({
                role: 'user',
                content: userMessage
            });
            // Send request to managed API
            const request = {
                messages,
                tools: tools.length > 0 ? tools : undefined,
                preferred_model: this._getPreferredManagedModel(),
                max_iterations: 5,
                temperature: 0.7,
                stream: useStreaming
            };
            // Use streaming if requested
            if (useStreaming) {
                await this._sendStreamingManagedAPIRequest(userMessage, threadId, request, tools);
            }
            else {
                await this._sendNonStreamingManagedAPIRequest(userMessage, threadId, request, tools);
            }
        }
        catch (error) {
            console.error('[ChatThreadService] Managed API error:', error);
            // Handle specific error types
            if (error instanceof ManagedChatAPIError) {
                this._handleManagedAPIError(error, threadId);
            }
            else {
                this._setStreamState(threadId, {
                    isRunning: undefined,
                    error: {
                        message: 'An unexpected error occurred with the managed API.',
                        fullError: error instanceof Error ? error : null
                    }
                });
            }
        }
    }
    /**
     * Send streaming managed API request
     */
    async _sendStreamingManagedAPIRequest(userMessage, threadId, request, tools) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        // State for accumulating streaming response
        let accumulatedContent = '';
        let accumulatedReasoning = '';
        let currentToolCall = null;
        let finalMetadata;
        // Set initial streaming state
        this._setStreamState(threadId, {
            isRunning: 'LLM',
            llmInfo: {
                displayContentSoFar: '',
                reasoningSoFar: '',
                toolCallSoFar: null
            },
            interrupt: Promise.resolve(() => { })
        });
        try {
            // Start streaming
            const { abort } = await this._managedChatAPI.sendStreamingChatCompletion(request, (event) => {
                // Handle different event types
                if (event.type === 'chunk') {
                    // Accumulate text delta
                    accumulatedContent += event.delta || '';
                    this._setStreamState(threadId, {
                        isRunning: 'LLM',
                        llmInfo: {
                            displayContentSoFar: accumulatedContent,
                            reasoningSoFar: accumulatedReasoning,
                            toolCallSoFar: currentToolCall
                        },
                        interrupt: Promise.resolve(abort)
                    });
                }
                else if (event.type === 'thinking') {
                    // Accumulate reasoning/thinking
                    accumulatedReasoning += event.content || '';
                    this._setStreamState(threadId, {
                        isRunning: 'LLM',
                        llmInfo: {
                            displayContentSoFar: accumulatedContent,
                            reasoningSoFar: accumulatedReasoning,
                            toolCallSoFar: currentToolCall
                        },
                        interrupt: Promise.resolve(abort)
                    });
                }
                else if (event.type === 'tool_start') {
                    // Tool execution started
                    currentToolCall = {
                        name: event.tool_name,
                        id: event.tool_id,
                        rawParams: event.parameters
                    };
                    this._setStreamState(threadId, {
                        isRunning: 'tool',
                        toolInfo: {
                            toolName: event.tool_name,
                            toolParams: event.parameters,
                            id: event.tool_id,
                            content: 'Tool executing...',
                            rawParams: event.parameters,
                            mcpServerName: undefined
                        },
                        interrupt: Promise.resolve(abort)
                    });
                }
                else if (event.type === 'tool_progress') {
                    // Update tool progress
                    this._setStreamState(threadId, {
                        isRunning: 'tool',
                        toolInfo: {
                            ...this.streamState[threadId].toolInfo,
                            content: event.message || `Progress: ${event.progress}%`
                        },
                        interrupt: Promise.resolve(abort)
                    });
                }
                else if (event.type === 'tool_complete') {
                    // Tool execution completed
                    currentToolCall = null;
                    this._setStreamState(threadId, {
                        isRunning: 'LLM',
                        llmInfo: {
                            displayContentSoFar: accumulatedContent,
                            reasoningSoFar: accumulatedReasoning,
                            toolCallSoFar: null
                        },
                        interrupt: Promise.resolve(abort)
                    });
                }
                else if (event.type === 'done') {
                    // Stream completed
                    finalMetadata = {
                        creditsConsumed: event.credits_consumed || 0,
                        creditsRemaining: event.credits_remaining || 0,
                        tokensUsed: event.usage?.total_tokens || 0,
                        promptTokens: event.usage?.prompt_tokens || 0,
                        completionTokens: event.usage?.completion_tokens || 0,
                        model: request.preferred_model || 'llama-3.3-70b-instruct',
                        provider: 'managed',
                        toolsUsed: this._detectToolUsageFromResponse(accumulatedContent, tools),
                        requestId: event.id || '',
                        timestamp: Date.now()
                    };
                }
            }, (error) => {
                // Handle streaming errors
                console.error('[ChatThreadService] Streaming error:', error);
                this._setStreamState(threadId, {
                    isRunning: undefined,
                    error: {
                        message: error.message,
                        fullError: error
                    }
                });
            });
            // Store abort function for interruption
            this._setStreamState(threadId, {
                isRunning: 'LLM',
                llmInfo: {
                    displayContentSoFar: accumulatedContent,
                    reasoningSoFar: accumulatedReasoning,
                    toolCallSoFar: currentToolCall
                },
                interrupt: Promise.resolve(abort)
            });
            // Wait for completion (the stream will call onEvent until done)
            // The streaming is handled asynchronously, so we need to wait
            // This is a simplified approach; in production you'd use a promise
            await new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (finalMetadata) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
                // Timeout after 5 minutes
                setTimeout(() => {
                    clearInterval(checkInterval);
                    resolve();
                }, 5 * 60 * 1000);
            });
            // Add messages to thread with metadata
            this._addMessageToThread(threadId, {
                role: 'user',
                content: userMessage,
                displayContent: userMessage,
                selections: thread.state.stagingSelections,
                state: defaultMessageState,
                metadata: finalMetadata
            });
            this._addMessageToThread(threadId, {
                role: 'assistant',
                displayContent: accumulatedContent,
                reasoning: accumulatedReasoning,
                anthropicReasoning: null,
                metadata: finalMetadata
            });
            // Track usage
            if (finalMetadata) {
                await this._usageTrackingService.trackManagedUsage(finalMetadata.model || 'unknown', finalMetadata.tokensUsed || 0, finalMetadata.creditsConsumed || 0);
                // Update credits display
                this._updateCreditsDisplay(finalMetadata.creditsRemaining || 0);
            }
            this._setStreamState(threadId, undefined);
            // Add checkpoint
            this._addUserCheckpoint({ threadId });
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Send non-streaming managed API request (original implementation)
     */
    async _sendNonStreamingManagedAPIRequest(userMessage, threadId, request, tools) {
        const thread = this.state.allThreads[threadId];
        if (!thread)
            return;
        this._setStreamState(threadId, { isRunning: 'LLM', llmInfo: { displayContentSoFar: '', reasoningSoFar: '', toolCallSoFar: null }, interrupt: Promise.resolve(() => { }) });
        const response = await this._managedChatAPI.sendChatCompletion(request);
        // Extract response
        const assistantMessage = response.choices[0]?.message.content || '';
        // Detect which tools were used from the response
        const toolsUsed = this._detectToolUsageFromResponse(assistantMessage, tools);
        // Create metadata
        const metadata = {
            creditsConsumed: response.credits_consumed,
            creditsRemaining: response.credits_remaining,
            tokensUsed: response.usage.total_tokens,
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            model: response.model,
            provider: response.provider,
            toolsUsed: toolsUsed,
            requestId: response.id,
            timestamp: Date.now()
        };
        // Add messages to thread with metadata
        this._addMessageToThread(threadId, {
            role: 'user',
            content: userMessage,
            displayContent: userMessage,
            selections: thread.state.stagingSelections,
            state: defaultMessageState,
            metadata
        });
        this._addMessageToThread(threadId, {
            role: 'assistant',
            displayContent: assistantMessage,
            reasoning: '',
            anthropicReasoning: null,
            metadata
        });
        // Track usage
        await this._usageTrackingService.trackManagedUsage(response.model, response.usage.total_tokens, response.credits_consumed);
        // Update credits display
        this._updateCreditsDisplay(response.credits_remaining);
        this._setStreamState(threadId, undefined);
        // Add checkpoint
        this._addUserCheckpoint({ threadId });
    }
    /**
     * Select tools based on message context
     */
    _selectToolsForContext(message, context) {
        const tools = [];
        // If code is selected, enable code_intelligence
        if (context?.selectedCode) {
            tools.push(this._codeIntelligenceService.getToolSchema());
        }
        // If message mentions docs/documentation, enable web_fetch
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('docs') ||
            lowerMessage.includes('documentation') ||
            lowerMessage.includes('api reference') ||
            lowerMessage.includes('official')) {
            tools.push(this._webFetchService.getToolSchema());
        }
        // Check user settings for auto tool calling
        // TODO: Add managedAPI settings when available
        // const settings = this._settingsService.state.globalSettings;
        // if (settings.managedAPI?.autoToolCalling) {
        // 	// Add default tools based on settings
        // }
        return tools;
    }
    /**
     * Convert chat messages to managed API format
     */
    _convertToManagedAPIMessages(messages) {
        const converted = [];
        for (const msg of messages) {
            if (msg.role === 'user') {
                converted.push({
                    role: 'user',
                    content: msg.displayContent || msg.content
                });
            }
            else if (msg.role === 'assistant') {
                converted.push({
                    role: 'assistant',
                    content: msg.displayContent
                });
            }
            // Skip tool messages, checkpoints, etc. for managed API
        }
        return converted;
    }
    /**
     * Get preferred model for managed API
     */
    _getPreferredManagedModel() {
        // TODO: Get from settings when available
        // const settings = this._settingsService.state.globalSettings;
        // return settings.managedAPI?.preferredModel || 'llama-3.3-70b-instruct';
        return 'llama-3.3-70b-instruct';
    }
    /**
     * Detect which tools were used from assistant response
     */
    _detectToolUsageFromResponse(content, availableTools) {
        const toolsUsed = [];
        const lowerContent = content.toLowerCase();
        // Look for tool mentions in response
        if (availableTools.some(t => t.name === 'code_intelligence')) {
            if (lowerContent.includes('analyzed the code') ||
                lowerContent.includes('code analysis') ||
                lowerContent.includes('code_intelligence')) {
                toolsUsed.push('code_intelligence');
            }
        }
        if (availableTools.some(t => t.name === 'web_fetch')) {
            if (lowerContent.includes('fetched documentation') ||
                lowerContent.includes('from the documentation') ||
                lowerContent.includes('web_fetch')) {
                toolsUsed.push('web_fetch');
            }
        }
        return toolsUsed;
    }
    /**
     * Update credits display (fires event for UI)
     */
    _updateCreditsDisplay(creditsRemaining) {
        // The usage tracking service will fire the onDidUpdateCredits event
        // UI components can listen to this event to update displays
        console.log(`[ChatThreadService] Credits remaining: ${creditsRemaining}`);
    }
    /**
     * Handle managed API specific errors
     */
    _handleManagedAPIError(error, threadId) {
        let errorMessage = error.message;
        let actionLabel;
        let actionCallback;
        if (error.isInsufficientCredits()) {
            errorMessage = 'Insufficient credits. Please upgrade your plan to continue using the managed API.';
            actionLabel = 'Upgrade Plan';
            actionCallback = () => {
                const upgradeUrl = error.getUpgradeURL() || 'https://ainative.studio/pricing';
                // TODO: Open upgrade URL in external browser
                console.log('Opening upgrade URL:', upgradeUrl);
            };
        }
        else if (error.isModelNotAvailable()) {
            errorMessage = 'The selected model is not available for your plan. Please upgrade or select a different model.';
            actionLabel = 'View Plans';
            actionCallback = () => {
                console.log('Opening pricing page');
            };
        }
        else if (error.isRateLimited()) {
            errorMessage = 'Rate limit exceeded. Please wait a moment before trying again.';
        }
        else if (error.isAuthError()) {
            errorMessage = 'Authentication error. Please log in again.';
            actionLabel = 'Log In';
            actionCallback = () => {
                console.log('Triggering login');
            };
        }
        this._setStreamState(threadId, {
            isRunning: undefined,
            error: {
                message: errorMessage,
                fullError: error
            }
        });
        // Show notification with action if available
        if (actionLabel && actionCallback) {
            this._notificationService.notify({
                severity: Severity.Error,
                message: errorMessage,
                actions: {
                    primary: [{
                            id: 'managedAPI.action',
                            label: actionLabel,
                            run: actionCallback,
                            enabled: true,
                            tooltip: '',
                            class: undefined
                        }]
                }
            });
        }
    }
};
ChatThreadService = __decorate([
    __param(0, IStorageService),
    __param(1, IAINativeModelService),
    __param(2, ILLMMessageService),
    __param(3, IToolsService),
    __param(4, IAINativeSettingsService),
    __param(5, ILanguageFeaturesService),
    __param(6, IMetricsService),
    __param(7, IEditCodeService),
    __param(8, INotificationService),
    __param(9, IConvertToLLMMessageService),
    __param(10, IWorkspaceContextService),
    __param(11, IDirectoryStrService),
    __param(12, IFileService),
    __param(13, IMCPService),
    __param(14, IManagedChatAPIService),
    __param(15, ICodeIntelligenceService),
    __param(16, IWebFetchService),
    __param(17, IUsageTrackingService)
], ChatThreadService);
registerSingleton(IChatThreadService, ChatThreadService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRocmVhZFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2Jyb3dzZXIvY2hhdFRocmVhZFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxpQkFBaUIsRUFBcUIsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUU5RyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzFGLE9BQU8sRUFBc0IsZUFBZSxFQUFvQyxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUUvRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRixPQUFPLEVBQUUsNkJBQTZCLEVBQStELE1BQU0sZ0NBQWdDLENBQUM7QUFDNUksT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ2xELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSx3QkFBd0IsRUFB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