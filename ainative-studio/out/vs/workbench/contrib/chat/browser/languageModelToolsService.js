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
var ToolConfirmStore_1;
import { renderStringAsPlaintext } from '../../../../base/browser/markdownRenderer.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { CancellationError, isCancellationError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable, DisposableStore, dispose, toDisposable } from '../../../../base/common/lifecycle.js';
import { LRUCache } from '../../../../base/common/map.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import * as JSONContributionRegistry from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { ChatToolInvocation } from '../common/chatProgressTypes/chatToolInvocation.js';
import { IChatService } from '../common/chatService.js';
import { ChatConfiguration } from '../common/constants.js';
import { stringifyPromptTsxPart } from '../common/languageModelToolsService.js';
const jsonSchemaRegistry = Registry.as(JSONContributionRegistry.Extensions.JSONContribution);
let LanguageModelToolsService = class LanguageModelToolsService extends Disposable {
    constructor(_instantiationService, _extensionService, _contextKeyService, _chatService, _dialogService, _telemetryService, _logService, _configurationService, _accessibilityService) {
        super();
        this._instantiationService = _instantiationService;
        this._extensionService = _extensionService;
        this._contextKeyService = _contextKeyService;
        this._chatService = _chatService;
        this._dialogService = _dialogService;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this._configurationService = _configurationService;
        this._accessibilityService = _accessibilityService;
        this._onDidChangeTools = new Emitter();
        this.onDidChangeTools = this._onDidChangeTools.event;
        /** Throttle tools updates because it sends all tools and runs on context key updates */
        this._onDidChangeToolsScheduler = new RunOnceScheduler(() => this._onDidChangeTools.fire(), 750);
        this._tools = new Map();
        this._toolContextKeys = new Set();
        this._callsByRequestId = new Map();
        this._memoryToolConfirmStore = new Set();
        this._workspaceToolConfirmStore = new Lazy(() => this._register(this._instantiationService.createInstance(ToolConfirmStore, 1 /* StorageScope.WORKSPACE */)));
        this._profileToolConfirmStore = new Lazy(() => this._register(this._instantiationService.createInstance(ToolConfirmStore, 0 /* StorageScope.PROFILE */)));
        this._register(this._contextKeyService.onDidChangeContext(e => {
            if (e.affectsSome(this._toolContextKeys)) {
                // Not worth it to compute a delta here unless we have many tools changing often
                this._onDidChangeToolsScheduler.schedule();
            }
        }));
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(ChatConfiguration.ExtensionToolsEnabled)) {
                this._onDidChangeToolsScheduler.schedule();
            }
        }));
        this._ctxToolsCount = ChatContextKeys.Tools.toolsCount.bindTo(_contextKeyService);
    }
    registerToolData(toolData) {
        if (this._tools.has(toolData.id)) {
            throw new Error(`Tool "${toolData.id}" is already registered.`);
        }
        this._tools.set(toolData.id, { data: toolData });
        this._ctxToolsCount.set(this._tools.size);
        this._onDidChangeToolsScheduler.schedule();
        toolData.when?.keys().forEach(key => this._toolContextKeys.add(key));
        let store;
        if (toolData.inputSchema) {
            store = new DisposableStore();
            const schemaUrl = URI.from({ scheme: Schemas.vscode, authority: 'schemas', path: `/lm/tool/${toolData.id}` }).toString();
            jsonSchemaRegistry.registerSchema(schemaUrl, toolData.inputSchema, store);
            store.add(jsonSchemaRegistry.registerSchemaAssociation(schemaUrl, `/lm/tool/${toolData.id}/tool_input.json`));
        }
        return toDisposable(() => {
            store?.dispose();
            this._tools.delete(toolData.id);
            this._ctxToolsCount.set(this._tools.size);
            this._refreshAllToolContextKeys();
            this._onDidChangeToolsScheduler.schedule();
        });
    }
    _refreshAllToolContextKeys() {
        this._toolContextKeys.clear();
        for (const tool of this._tools.values()) {
            tool.data.when?.keys().forEach(key => this._toolContextKeys.add(key));
        }
    }
    registerToolImplementation(id, tool) {
        const entry = this._tools.get(id);
        if (!entry) {
            throw new Error(`Tool "${id}" was not contributed.`);
        }
        if (entry.impl) {
            throw new Error(`Tool "${id}" already has an implementation.`);
        }
        entry.impl = tool;
        return toDisposable(() => {
            entry.impl = undefined;
        });
    }
    getTools() {
        const toolDatas = Iterable.map(this._tools.values(), i => i.data);
        const extensionToolsEnabled = this._configurationService.getValue(ChatConfiguration.ExtensionToolsEnabled);
        return Iterable.filter(toolDatas, toolData => {
            const satisfiesWhenClause = !toolData.when || this._contextKeyService.contextMatchesRules(toolData.when);
            const satisfiesExternalToolCheck = toolData.source.type === 'extension' && !extensionToolsEnabled ?
                !toolData.source.isExternalTool :
                true;
            return satisfiesWhenClause && satisfiesExternalToolCheck;
        });
    }
    getTool(id) {
        return this._getToolEntry(id)?.data;
    }
    _getToolEntry(id) {
        const entry = this._tools.get(id);
        if (entry && (!entry.data.when || this._contextKeyService.contextMatchesRules(entry.data.when))) {
            return entry;
        }
        else {
            return undefined;
        }
    }
    getToolByName(name) {
        for (const toolData of this.getTools()) {
            if (toolData.toolReferenceName === name) {
                return toolData;
            }
        }
        return undefined;
    }
    setToolAutoConfirmation(toolId, scope, autoConfirm = true) {
        if (scope === 'workspace') {
            this._workspaceToolConfirmStore.value.setAutoConfirm(toolId, autoConfirm);
        }
        else if (scope === 'profile') {
            this._profileToolConfirmStore.value.setAutoConfirm(toolId, autoConfirm);
        }
        else {
            this._memoryToolConfirmStore.add(toolId);
        }
    }
    resetToolAutoConfirmation() {
        this._workspaceToolConfirmStore.value.reset();
        this._profileToolConfirmStore.value.reset();
        this._memoryToolConfirmStore.clear();
    }
    async invokeTool(dto, countTokens, token) {
        this._logService.trace(`[LanguageModelToolsService#invokeTool] Invoking tool ${dto.toolId} with parameters ${JSON.stringify(dto.parameters)}`);
        // When invoking a tool, don't validate the "when" clause. An extension may have invoked a tool just as it was becoming disabled, and just let it go through rather than throw and break the chat.
        let tool = this._tools.get(dto.toolId);
        if (!tool) {
            throw new Error(`Tool ${dto.toolId} was not contributed`);
        }
        if (!tool.impl) {
            await this._extensionService.activateByEvent(`onLanguageModelTool:${dto.toolId}`);
            // Extension should activate and register the tool implementation
            tool = this._tools.get(dto.toolId);
            if (!tool?.impl) {
                throw new Error(`Tool ${dto.toolId} does not have an implementation registered.`);
            }
        }
        // Shortcut to write to the model directly here, but could call all the way back to use the real stream.
        let toolInvocation;
        let requestId;
        let store;
        let toolResult;
        try {
            if (dto.context) {
                store = new DisposableStore();
                const model = this._chatService.getSession(dto.context?.sessionId);
                if (!model) {
                    throw new Error(`Tool called for unknown chat session`);
                }
                const request = model.getRequests().at(-1);
                requestId = request.id;
                dto.modelId = request.modelId;
                // Replace the token with a new token that we can cancel when cancelToolCallsForRequest is called
                if (!this._callsByRequestId.has(requestId)) {
                    this._callsByRequestId.set(requestId, []);
                }
                this._callsByRequestId.get(requestId).push(store);
                const source = new CancellationTokenSource();
                store.add(toDisposable(() => {
                    source.dispose(true);
                }));
                store.add(token.onCancellationRequested(() => {
                    toolInvocation?.confirmed.complete(false);
                    source.cancel();
                }));
                store.add(source.token.onCancellationRequested(() => {
                    toolInvocation?.confirmed.complete(false);
                }));
                token = source.token;
                const prepared = await this.prepareToolInvocation(tool, dto, token);
                toolInvocation = new ChatToolInvocation(prepared, tool.data, dto.callId);
                if (this.shouldAutoConfirm(tool.data.id, tool.data.runsInWorkspace)) {
                    toolInvocation.confirmed.complete(true);
                }
                model.acceptResponseProgress(request, toolInvocation);
                if (prepared?.confirmationMessages) {
                    this._accessibilityService.alert(localize('toolConfirmationMessage', "Action required: {0}", prepared.confirmationMessages.title));
                    const userConfirmed = await toolInvocation.confirmed.p;
                    if (!userConfirmed) {
                        throw new CancellationError();
                    }
                    dto.toolSpecificData = toolInvocation?.toolSpecificData;
                    if (dto.toolSpecificData?.kind === 'input') {
                        dto.parameters = dto.toolSpecificData.rawInput;
                        dto.toolSpecificData = undefined;
                    }
                }
            }
            else {
                const prepared = await this.prepareToolInvocation(tool, dto, token);
                if (prepared?.confirmationMessages) {
                    const result = await this._dialogService.confirm({ message: prepared.confirmationMessages.title, detail: renderStringAsPlaintext(prepared.confirmationMessages.message) });
                    if (!result.confirmed) {
                        throw new CancellationError();
                    }
                }
            }
            if (token.isCancellationRequested) {
                throw new CancellationError();
            }
            toolResult = await tool.impl.invoke(dto, countTokens, token);
            this.ensureToolDetails(dto, toolResult, tool.data);
            this._telemetryService.publicLog2('languageModelToolInvoked', {
                result: 'success',
                chatSessionId: dto.context?.sessionId,
                toolId: tool.data.id,
                toolExtensionId: tool.data.source.type === 'extension' ? tool.data.source.extensionId.value : undefined,
                toolSourceKind: tool.data.source.type,
            });
            return toolResult;
        }
        catch (err) {
            const result = isCancellationError(err) ? 'userCancelled' : 'error';
            this._telemetryService.publicLog2('languageModelToolInvoked', {
                result,
                chatSessionId: dto.context?.sessionId,
                toolId: tool.data.id,
                toolExtensionId: tool.data.source.type === 'extension' ? tool.data.source.extensionId.value : undefined,
                toolSourceKind: tool.data.source.type,
            });
            this._logService.error(`[LanguageModelToolsService#invokeTool] Error from tool ${dto.toolId}: ${toErrorMessage(err)}. With parameters ${JSON.stringify(dto.parameters)}`);
            throw err;
        }
        finally {
            toolInvocation?.complete(toolResult);
            if (requestId && store) {
                this.cleanupCallDisposables(requestId, store);
            }
        }
    }
    async prepareToolInvocation(tool, dto, token) {
        let prepared = tool.impl.prepareToolInvocation ?
            await tool.impl.prepareToolInvocation(dto.parameters, token)
            : undefined;
        if (!prepared?.confirmationMessages && tool.data.requiresConfirmation && tool.data.source.type === 'extension') {
            if (!prepared) {
                prepared = {};
            }
            const toolWarning = localize('tool.warning', "{0} This tool is from the extension `{1}`. Please carefully review any requested actions.", '$(info)', tool.data.source.extensionId.value);
            prepared.confirmationMessages = {
                title: localize('msg.title', "Run {0}", `"${tool.data.displayName}"`),
                message: new MarkdownString((tool.data.userDescription ?? tool.data.modelDescription) + '\n\n' + toolWarning, { supportThemeIcons: true }),
                allowAutoConfirm: true,
            };
        }
        if (prepared?.confirmationMessages) {
            if (prepared.toolSpecificData?.kind !== 'terminal' && typeof prepared.confirmationMessages.allowAutoConfirm !== 'boolean') {
                prepared.confirmationMessages.allowAutoConfirm = true;
            }
            if (!prepared.toolSpecificData && tool.data.alwaysDisplayInputOutput) {
                prepared.toolSpecificData = {
                    kind: 'input',
                    rawInput: dto.parameters,
                };
            }
        }
        return prepared;
    }
    ensureToolDetails(dto, toolResult, toolData) {
        if (!toolResult.toolResultDetails && toolData.alwaysDisplayInputOutput) {
            toolResult.toolResultDetails = {
                input: JSON.stringify(dto.parameters, undefined, 2),
                output: this.toolResultToString(toolResult),
            };
        }
    }
    toolResultToString(toolResult) {
        const strs = [];
        for (const part of toolResult.content) {
            if (part.kind === 'text') {
                strs.push(part.value);
            }
            else if (part.kind === 'promptTsx') {
                strs.push(stringifyPromptTsxPart(part));
            }
        }
        return strs.join('');
    }
    shouldAutoConfirm(toolId, runsInWorkspace) {
        if (this._workspaceToolConfirmStore.value.getAutoConfirm(toolId) || this._profileToolConfirmStore.value.getAutoConfirm(toolId) || this._memoryToolConfirmStore.has(toolId)) {
            return true;
        }
        const config = this._configurationService.inspect('chat.tools.autoApprove');
        // If we know the tool runs at a global level, only consider the global config.
        // If we know the tool runs at a workspace level, use those specific settings when appropriate.
        let value = config.value ?? config.defaultValue;
        if (typeof runsInWorkspace === 'boolean') {
            value = config.userLocalValue ?? config.applicationValue;
            if (runsInWorkspace) {
                value = config.workspaceValue ?? config.workspaceFolderValue ?? config.userRemoteValue ?? value;
            }
        }
        return value === true || (typeof value === 'object' && value.hasOwnProperty(toolId) && value[toolId] === true);
    }
    cleanupCallDisposables(requestId, store) {
        const disposables = this._callsByRequestId.get(requestId);
        if (disposables) {
            const index = disposables.indexOf(store);
            if (index > -1) {
                disposables.splice(index, 1);
            }
            if (disposables.length === 0) {
                this._callsByRequestId.delete(requestId);
            }
        }
        store.dispose();
    }
    cancelToolCallsForRequest(requestId) {
        const calls = this._callsByRequestId.get(requestId);
        if (calls) {
            calls.forEach(call => call.dispose());
            this._callsByRequestId.delete(requestId);
        }
    }
    dispose() {
        super.dispose();
        this._callsByRequestId.forEach(calls => dispose(calls));
        this._ctxToolsCount.reset();
    }
};
LanguageModelToolsService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IExtensionService),
    __param(2, IContextKeyService),
    __param(3, IChatService),
    __param(4, IDialogService),
    __param(5, ITelemetryService),
    __param(6, ILogService),
    __param(7, IConfigurationService),
    __param(8, IAccessibilityService)
], LanguageModelToolsService);
export { LanguageModelToolsService };
let ToolConfirmStore = class ToolConfirmStore extends Disposable {
    static { ToolConfirmStore_1 = this; }
    static { this.STORED_KEY = 'chat/autoconfirm'; }
    constructor(_scope, storageService) {
        super();
        this._scope = _scope;
        this.storageService = storageService;
        this._autoConfirmTools = new LRUCache(100);
        this._didChange = false;
        const stored = storageService.getObject(ToolConfirmStore_1.STORED_KEY, this._scope);
        if (stored) {
            for (const key of stored) {
                this._autoConfirmTools.set(key, true);
            }
        }
        this._register(storageService.onWillSaveState(() => {
            if (this._didChange) {
                this.storageService.store(ToolConfirmStore_1.STORED_KEY, [...this._autoConfirmTools.keys()], this._scope, 1 /* StorageTarget.MACHINE */);
                this._didChange = false;
            }
        }));
    }
    reset() {
        this._autoConfirmTools.clear();
        this._didChange = true;
    }
    getAutoConfirm(toolId) {
        if (this._autoConfirmTools.get(toolId)) {
            this._didChange = true;
            return true;
        }
        return false;
    }
    setAutoConfirm(toolId, autoConfirm) {
        if (autoConfirm) {
            this._autoConfirmTools.set(toolId, true);
        }
        else {
            this._autoConfirmTools.delete(toolId);
        }
        this._didChange = true;
    }
};
ToolConfirmStore = ToolConfirmStore_1 = __decorate([
    __param(1, IStorageService)
], ToolConfirmStore);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbFRvb2xzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvbGFuZ3VhZ2VNb2RlbFRvb2xzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDdkYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEUsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMzRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxLQUFLLHdCQUF3QixNQUFNLHFFQUFxRSxDQUFDO0FBQ2hILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFL0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDdkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzNELE9BQU8sRUFBZ0ksc0JBQXNCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUU5TSxNQUFNLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQXFELHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBTzFJLElBQU0seUJBQXlCLEdBQS9CLE1BQU0seUJBQTBCLFNBQVEsVUFBVTtJQW1CeEQsWUFDd0IscUJBQTZELEVBQ2pFLGlCQUFxRCxFQUNwRCxrQkFBdUQsRUFDN0QsWUFBMkMsRUFDekMsY0FBK0MsRUFDNUMsaUJBQXFELEVBQzNELFdBQXlDLEVBQy9CLHFCQUE2RCxFQUM3RCxxQkFBNkQ7UUFFcEYsS0FBSyxFQUFFLENBQUM7UUFWZ0MsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUNoRCxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBQ25DLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFDNUMsaUJBQVksR0FBWixZQUFZLENBQWM7UUFDeEIsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBQzNCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDMUMsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFDZCwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQzVDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUF6QjdFLHNCQUFpQixHQUFHLElBQUksT0FBTyxFQUFRLENBQUM7UUFDdkMscUJBQWdCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQztRQUV6RCx3RkFBd0Y7UUFDaEYsK0JBQTBCLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFFNUYsV0FBTSxHQUFHLElBQUksR0FBRyxFQUFzQixDQUFDO1FBQ3ZDLHFCQUFnQixHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFHckMsc0JBQWlCLEdBQUcsSUFBSSxHQUFHLEVBQXlCLENBQUM7UUFJckQsNEJBQXVCLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQWVuRCxJQUFJLENBQUMsMEJBQTBCLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixpQ0FBeUIsQ0FBQyxDQUFDLENBQUM7UUFDdEosSUFBSSxDQUFDLHdCQUF3QixHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsK0JBQXVCLENBQUMsQ0FBQyxDQUFDO1FBRWxKLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzdELElBQUksQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDO2dCQUMxQyxnRkFBZ0Y7Z0JBQ2hGLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUM1QyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3RFLElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUFDLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQztnQkFDckUsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzVDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLGNBQWMsR0FBRyxlQUFlLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUNuRixDQUFDO0lBRUQsZ0JBQWdCLENBQUMsUUFBbUI7UUFDbkMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNsQyxNQUFNLElBQUksS0FBSyxDQUFDLFNBQVMsUUFBUSxDQUFDLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztRQUNqRSxDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ2pELElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFFBQVEsRUFBRSxDQUFDO1FBRTNDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRXJFLElBQUksS0FBa0MsQ0FBQztRQUN2QyxJQUFJLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUMxQixLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUM5QixNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsWUFBWSxRQUFRLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3pILGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMxRSxLQUFLLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLHlCQUF5QixDQUFDLFNBQVMsRUFBRSxZQUFZLFFBQVEsQ0FBQyxFQUFFLGtCQUFrQixDQUFDLENBQUMsQ0FBQztRQUMvRyxDQUFDO1FBRUQsT0FBTyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ3hCLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQztZQUNqQixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDaEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMxQyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDNUMsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sMEJBQTBCO1FBQ2pDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUM5QixLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztZQUN6QyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDdkUsQ0FBQztJQUNGLENBQUM7SUFFRCwwQkFBMEIsQ0FBQyxFQUFVLEVBQUUsSUFBZTtRQUNyRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNsQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixNQUFNLElBQUksS0FBSyxDQUFDLFNBQVMsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1FBQ3RELENBQUM7UUFFRCxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLFNBQVMsRUFBRSxrQ0FBa0MsQ0FBQyxDQUFDO1FBQ2hFLENBQUM7UUFFRCxLQUFLLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNsQixPQUFPLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDeEIsS0FBSyxDQUFDLElBQUksR0FBRyxTQUFTLENBQUM7UUFDeEIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsUUFBUTtRQUNQLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsRSxNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUMzRyxPQUFPLFFBQVEsQ0FBQyxNQUFNLENBQ3JCLFNBQVMsRUFDVCxRQUFRLENBQUMsRUFBRTtZQUNWLE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDekcsTUFBTSwwQkFBMEIsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxXQUFXLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO2dCQUNsRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUM7Z0JBQ2pDLElBQUksQ0FBQztZQUNOLE9BQU8sbUJBQW1CLElBQUksMEJBQTBCLENBQUM7UUFDMUQsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsT0FBTyxDQUFDLEVBQVU7UUFDakIsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQztJQUNyQyxDQUFDO0lBRU8sYUFBYSxDQUFDLEVBQVU7UUFDL0IsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbEMsSUFBSSxLQUFLLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNqRyxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztJQUNGLENBQUM7SUFFRCxhQUFhLENBQUMsSUFBWTtRQUN6QixLQUFLLE1BQU0sUUFBUSxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ3hDLElBQUksUUFBUSxDQUFDLGlCQUFpQixLQUFLLElBQUksRUFBRSxDQUFDO2dCQUN6QyxPQUFPLFFBQVEsQ0FBQztZQUNqQixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxNQUFjLEVBQUUsS0FBeUMsRUFBRSxXQUFXLEdBQUcsSUFBSTtRQUNwRyxJQUFJLEtBQUssS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDM0UsQ0FBQzthQUFNLElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQztRQUN6RSxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDMUMsQ0FBQztJQUNGLENBQUM7SUFFRCx5QkFBeUI7UUFDeEIsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUM5QyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzVDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN0QyxDQUFDO0lBRUQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFvQixFQUFFLFdBQWdDLEVBQUUsS0FBd0I7UUFDaEcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsd0RBQXdELEdBQUcsQ0FBQyxNQUFNLG9CQUFvQixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFL0ksa01BQWtNO1FBQ2xNLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN2QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxNQUFNLElBQUksS0FBSyxDQUFDLFFBQVEsR0FBRyxDQUFDLE1BQU0sc0JBQXNCLENBQUMsQ0FBQztRQUMzRCxDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsdUJBQXVCLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBRWxGLGlFQUFpRTtZQUNqRSxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25DLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUM7Z0JBQ2pCLE1BQU0sSUFBSSxLQUFLLENBQUMsUUFBUSxHQUFHLENBQUMsTUFBTSw4Q0FBOEMsQ0FBQyxDQUFDO1lBQ25GLENBQUM7UUFDRixDQUFDO1FBRUQsd0dBQXdHO1FBQ3hHLElBQUksY0FBOEMsQ0FBQztRQUVuRCxJQUFJLFNBQTZCLENBQUM7UUFDbEMsSUFBSSxLQUFrQyxDQUFDO1FBQ3ZDLElBQUksVUFBbUMsQ0FBQztRQUN4QyxJQUFJLENBQUM7WUFDSixJQUFJLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDakIsS0FBSyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7Z0JBQzlCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUEwQixDQUFDO2dCQUM1RixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO2dCQUN6RCxDQUFDO2dCQUVELE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQztnQkFDNUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZCLEdBQUcsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztnQkFFOUIsaUdBQWlHO2dCQUNqRyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO29CQUM1QyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDM0MsQ0FBQztnQkFDRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFFbkQsTUFBTSxNQUFNLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO2dCQUM3QyxLQUFLLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUU7b0JBQzNCLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3RCLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ0osS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFO29CQUM1QyxjQUFjLEVBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDMUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNqQixDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNKLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLEVBQUU7b0JBQ25ELGNBQWMsRUFBRSxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNKLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDO2dCQUVyQixNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUNwRSxjQUFjLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3pFLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztvQkFDckUsY0FBYyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3pDLENBQUM7Z0JBRUQsS0FBSyxDQUFDLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsQ0FBQztnQkFDdEQsSUFBSSxRQUFRLEVBQUUsb0JBQW9CLEVBQUUsQ0FBQztvQkFDcEMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMseUJBQXlCLEVBQUUsc0JBQXNCLEVBQUUsUUFBUSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7b0JBQ25JLE1BQU0sYUFBYSxHQUFHLE1BQU0sY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7b0JBQ3ZELElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQzt3QkFDcEIsTUFBTSxJQUFJLGlCQUFpQixFQUFFLENBQUM7b0JBQy9CLENBQUM7b0JBRUQsR0FBRyxDQUFDLGdCQUFnQixHQUFHLGNBQWMsRUFBRSxnQkFBZ0IsQ0FBQztvQkFFeEQsSUFBSSxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxLQUFLLE9BQU8sRUFBRSxDQUFDO3dCQUM1QyxHQUFHLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUM7d0JBQy9DLEdBQUcsQ0FBQyxnQkFBZ0IsR0FBRyxTQUFTLENBQUM7b0JBQ2xDLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUNwRSxJQUFJLFFBQVEsRUFBRSxvQkFBb0IsRUFBRSxDQUFDO29CQUNwQyxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQzNLLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7d0JBQ3ZCLE1BQU0sSUFBSSxpQkFBaUIsRUFBRSxDQUFDO29CQUMvQixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztnQkFDbkMsTUFBTSxJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDL0IsQ0FBQztZQUVELFVBQVUsR0FBRyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDN0QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRW5ELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQ2hDLDBCQUEwQixFQUMxQjtnQkFDQyxNQUFNLEVBQUUsU0FBUztnQkFDakIsYUFBYSxFQUFFLEdBQUcsQ0FBQyxPQUFPLEVBQUUsU0FBUztnQkFDckMsTUFBTSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDcEIsZUFBZSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFNBQVM7Z0JBQ3ZHLGNBQWMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJO2FBQ3JDLENBQUMsQ0FBQztZQUNKLE9BQU8sVUFBVSxDQUFDO1FBQ25CLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsTUFBTSxNQUFNLEdBQUcsbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1lBQ3BFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQ2hDLDBCQUEwQixFQUMxQjtnQkFDQyxNQUFNO2dCQUNOLGFBQWEsRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFLFNBQVM7Z0JBQ3JDLE1BQU0sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3BCLGVBQWUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxTQUFTO2dCQUN2RyxjQUFjLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSTthQUNyQyxDQUFDLENBQUM7WUFDSixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQywwREFBMEQsR0FBRyxDQUFDLE1BQU0sS0FBSyxjQUFjLENBQUMsR0FBRyxDQUFDLHFCQUFxQixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDMUssTUFBTSxHQUFHLENBQUM7UUFDWCxDQUFDO2dCQUFTLENBQUM7WUFDVixjQUFjLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBRXJDLElBQUksU0FBUyxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUN4QixJQUFJLENBQUMsc0JBQXNCLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQy9DLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxJQUFnQixFQUFFLEdBQW9CLEVBQUUsS0FBd0I7UUFDbkcsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQ2hELE1BQU0sSUFBSSxDQUFDLElBQUssQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQztZQUM3RCxDQUFDLENBQUMsU0FBUyxDQUFDO1FBRWIsSUFBSSxDQUFDLFFBQVEsRUFBRSxvQkFBb0IsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUNoSCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2YsUUFBUSxHQUFHLEVBQUUsQ0FBQztZQUNmLENBQUM7WUFFRCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQzNCLGNBQWMsRUFDZCwyRkFBMkYsRUFDM0YsU0FBUyxFQUNULElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQ2xDLENBQUM7WUFDRixRQUFRLENBQUMsb0JBQW9CLEdBQUc7Z0JBQy9CLEtBQUssRUFBRSxRQUFRLENBQUMsV0FBVyxFQUFFLFNBQVMsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUM7Z0JBQ3JFLE9BQU8sRUFBRSxJQUFJLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxNQUFNLEdBQUcsV0FBVyxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLENBQUM7Z0JBQzFJLGdCQUFnQixFQUFFLElBQUk7YUFDdEIsQ0FBQztRQUNILENBQUM7UUFFRCxJQUFJLFFBQVEsRUFBRSxvQkFBb0IsRUFBRSxDQUFDO1lBQ3BDLElBQUksUUFBUSxDQUFDLGdCQUFnQixFQUFFLElBQUksS0FBSyxVQUFVLElBQUksT0FBTyxRQUFRLENBQUMsb0JBQW9CLENBQUMsZ0JBQWdCLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQzNILFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7WUFDdkQsQ0FBQztZQUVELElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO2dCQUN0RSxRQUFRLENBQUMsZ0JBQWdCLEdBQUc7b0JBQzNCLElBQUksRUFBRSxPQUFPO29CQUNiLFFBQVEsRUFBRSxHQUFHLENBQUMsVUFBVTtpQkFDeEIsQ0FBQztZQUNILENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxRQUFRLENBQUM7SUFDakIsQ0FBQztJQUVPLGlCQUFpQixDQUFDLEdBQW9CLEVBQUUsVUFBdUIsRUFBRSxRQUFtQjtRQUMzRixJQUFJLENBQUMsVUFBVSxDQUFDLGlCQUFpQixJQUFJLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQ3hFLFVBQVUsQ0FBQyxpQkFBaUIsR0FBRztnQkFDOUIsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO2dCQUNuRCxNQUFNLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQzthQUMzQyxDQUFDO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxVQUF1QjtRQUNqRCxNQUFNLElBQUksR0FBRyxFQUFFLENBQUM7UUFDaEIsS0FBSyxNQUFNLElBQUksSUFBSSxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDdkMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN2QixDQUFDO2lCQUFNLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxXQUFXLEVBQUUsQ0FBQztnQkFDdEMsSUFBSSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3pDLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3RCLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxNQUFjLEVBQUUsZUFBb0M7UUFDN0UsSUFBSSxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDNUssT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBb0Msd0JBQXdCLENBQUMsQ0FBQztRQUUvRywrRUFBK0U7UUFDL0UsK0ZBQStGO1FBQy9GLElBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLElBQUksTUFBTSxDQUFDLFlBQVksQ0FBQztRQUNoRCxJQUFJLE9BQU8sZUFBZSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzFDLEtBQUssR0FBRyxNQUFNLENBQUMsY0FBYyxJQUFJLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztZQUN6RCxJQUFJLGVBQWUsRUFBRSxDQUFDO2dCQUNyQixLQUFLLEdBQUcsTUFBTSxDQUFDLGNBQWMsSUFBSSxNQUFNLENBQUMsb0JBQW9CLElBQUksTUFBTSxDQUFDLGVBQWUsSUFBSSxLQUFLLENBQUM7WUFDakcsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLEtBQUssS0FBSyxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssS0FBSyxRQUFRLElBQUksS0FBSyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUM7SUFDaEgsQ0FBQztJQUVPLHNCQUFzQixDQUFDLFNBQWlCLEVBQUUsS0FBc0I7UUFDdkUsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMxRCxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2pCLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDekMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDaEIsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDOUIsQ0FBQztZQUNELElBQUksV0FBVyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDOUIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUMxQyxDQUFDO1FBQ0YsQ0FBQztRQUNELEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDO0lBRUQseUJBQXlCLENBQUMsU0FBaUI7UUFDMUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNwRCxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQ3RDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDMUMsQ0FBQztJQUNGLENBQUM7SUFFZSxPQUFPO1FBQ3RCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUVoQixJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDeEQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM3QixDQUFDO0NBQ0QsQ0FBQTtBQXBZWSx5QkFBeUI7SUFvQm5DLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHFCQUFxQixDQUFBO0dBNUJYLHlCQUF5QixDQW9ZckM7O0FBb0JELElBQU0sZ0JBQWdCLEdBQXRCLE1BQU0sZ0JBQWlCLFNBQVEsVUFBVTs7YUFDaEIsZUFBVSxHQUFHLGtCQUFrQixBQUFyQixDQUFzQjtJQUt4RCxZQUNrQixNQUFvQixFQUNwQixjQUFnRDtRQUVqRSxLQUFLLEVBQUUsQ0FBQztRQUhTLFdBQU0sR0FBTixNQUFNLENBQWM7UUFDSCxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFMMUQsc0JBQWlCLEdBQThCLElBQUksUUFBUSxDQUFrQixHQUFHLENBQUMsQ0FBQztRQUNsRixlQUFVLEdBQUcsS0FBSyxDQUFDO1FBUTFCLE1BQU0sTUFBTSxHQUFHLGNBQWMsQ0FBQyxTQUFTLENBQVcsa0JBQWdCLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM1RixJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDMUIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDdkMsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFO1lBQ2xELElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUNyQixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxrQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLGdDQUF3QixDQUFDO2dCQUMvSCxJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQztZQUN6QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTSxLQUFLO1FBQ1gsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxDQUFDO1FBQy9CLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO0lBQ3hCLENBQUM7SUFFTSxjQUFjLENBQUMsTUFBYztRQUNuQyxJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUN4QyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztZQUN2QixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFTSxjQUFjLENBQUMsTUFBYyxFQUFFLFdBQW9CO1FBQ3pELElBQUksV0FBVyxFQUFFLENBQUM7WUFDakIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDMUMsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3ZDLENBQUM7UUFDRCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztJQUN4QixDQUFDOztBQWhESSxnQkFBZ0I7SUFRbkIsV0FBQSxlQUFlLENBQUE7R0FSWixnQkFBZ0IsQ0FpRHJCIn0=