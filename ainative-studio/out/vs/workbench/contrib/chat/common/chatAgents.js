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
var ChatAgentNameService_1;
import { findLast } from '../../../../base/common/arraysFind.js';
import { timeout } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { isMarkdownString } from '../../../../base/common/htmlContent.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { revive } from '../../../../base/common/marshalling.js';
import { observableValue } from '../../../../base/common/observable.js';
import { equalsIgnoreCase } from '../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { asJson, IRequestService } from '../../../../platform/request/common/request.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ChatContextKeys } from './chatContextKeys.js';
import { ChatAgentLocation, ChatMode } from './constants.js';
export function isChatWelcomeMessageContent(obj) {
    return obj &&
        ThemeIcon.isThemeIcon(obj.icon) &&
        typeof obj.title === 'string' &&
        isMarkdownString(obj.message);
}
export const IChatAgentService = createDecorator('chatAgentService');
let ChatAgentService = class ChatAgentService extends Disposable {
    static { this.AGENT_LEADER = '@'; }
    constructor(contextKeyService) {
        super();
        this.contextKeyService = contextKeyService;
        this._agents = new Map();
        this._onDidChangeAgents = new Emitter();
        this.onDidChangeAgents = this._onDidChangeAgents.event;
        this._agentsContextKeys = new Set();
        this._chatParticipantDetectionProviders = new Map();
        this._agentCompletionProviders = new Map();
        this._hasDefaultAgent = ChatContextKeys.enabled.bindTo(this.contextKeyService);
        this._defaultAgentRegistered = ChatContextKeys.panelParticipantRegistered.bindTo(this.contextKeyService);
        this._editingAgentRegistered = ChatContextKeys.editingParticipantRegistered.bindTo(this.contextKeyService);
        this._register(contextKeyService.onDidChangeContext((e) => {
            if (e.affectsSome(this._agentsContextKeys)) {
                this._updateContextKeys();
            }
        }));
        this._hasToolsAgentContextKey = ChatContextKeys.Editing.hasToolsAgent.bindTo(contextKeyService);
    }
    registerAgent(id, data) {
        const existingAgent = this.getAgent(id);
        if (existingAgent) {
            throw new Error(`Agent already registered: ${JSON.stringify(id)}`);
        }
        const that = this;
        const commands = data.slashCommands;
        data = {
            ...data,
            get slashCommands() {
                return commands.filter(c => !c.when || that.contextKeyService.contextMatchesRules(ContextKeyExpr.deserialize(c.when)));
            }
        };
        const entry = { data };
        this._agents.set(id, entry);
        this._updateAgentsContextKeys();
        this._updateContextKeys();
        this._onDidChangeAgents.fire(undefined);
        return toDisposable(() => {
            this._agents.delete(id);
            this._updateAgentsContextKeys();
            this._updateContextKeys();
            this._onDidChangeAgents.fire(undefined);
        });
    }
    _updateAgentsContextKeys() {
        // Update the set of context keys used by all agents
        this._agentsContextKeys.clear();
        for (const agent of this._agents.values()) {
            if (agent.data.when) {
                const expr = ContextKeyExpr.deserialize(agent.data.when);
                for (const key of expr?.keys() || []) {
                    this._agentsContextKeys.add(key);
                }
            }
        }
    }
    _updateContextKeys() {
        let editingAgentRegistered = false;
        let defaultAgentRegistered = false;
        let toolsAgentRegistered = false;
        for (const agent of this.getAgents()) {
            if (agent.isDefault && agent.locations.includes(ChatAgentLocation.EditingSession)) {
                editingAgentRegistered = true;
                if (agent.isToolsAgent) {
                    toolsAgentRegistered = true;
                }
            }
            else if (agent.isDefault) {
                defaultAgentRegistered = true;
            }
        }
        this._editingAgentRegistered.set(editingAgentRegistered);
        this._defaultAgentRegistered.set(defaultAgentRegistered);
        if (toolsAgentRegistered !== this._hasToolsAgentContextKey.get()) {
            this._hasToolsAgentContextKey.set(toolsAgentRegistered);
            this._onDidChangeAgents.fire(this.getDefaultAgent(ChatAgentLocation.EditingSession));
        }
    }
    registerAgentImplementation(id, agentImpl) {
        const entry = this._agents.get(id);
        if (!entry) {
            throw new Error(`Unknown agent: ${JSON.stringify(id)}`);
        }
        if (entry.impl) {
            throw new Error(`Agent already has implementation: ${JSON.stringify(id)}`);
        }
        if (entry.data.isDefault) {
            this._hasDefaultAgent.set(true);
        }
        entry.impl = agentImpl;
        this._onDidChangeAgents.fire(new MergedChatAgent(entry.data, agentImpl));
        return toDisposable(() => {
            entry.impl = undefined;
            this._onDidChangeAgents.fire(undefined);
            if (entry.data.isDefault) {
                this._hasDefaultAgent.set(false);
            }
        });
    }
    registerDynamicAgent(data, agentImpl) {
        data.isDynamic = true;
        const agent = { data, impl: agentImpl };
        this._agents.set(data.id, agent);
        this._onDidChangeAgents.fire(new MergedChatAgent(data, agentImpl));
        return toDisposable(() => {
            this._agents.delete(data.id);
            this._onDidChangeAgents.fire(undefined);
        });
    }
    registerAgentCompletionProvider(id, provider) {
        this._agentCompletionProviders.set(id, provider);
        return {
            dispose: () => { this._agentCompletionProviders.delete(id); }
        };
    }
    async getAgentCompletionItems(id, query, token) {
        return await this._agentCompletionProviders.get(id)?.(query, token) ?? [];
    }
    updateAgent(id, updateMetadata) {
        const agent = this._agents.get(id);
        if (!agent?.impl) {
            throw new Error(`No activated agent with id ${JSON.stringify(id)} registered`);
        }
        agent.data.metadata = { ...agent.data.metadata, ...updateMetadata };
        this._onDidChangeAgents.fire(new MergedChatAgent(agent.data, agent.impl));
    }
    getDefaultAgent(location, mode) {
        if (mode === ChatMode.Edit || mode === ChatMode.Agent) {
            location = ChatAgentLocation.EditingSession;
        }
        return this._preferExtensionAgent(this.getActivatedAgents().filter(a => {
            if ((mode === ChatMode.Agent) !== !!a.isToolsAgent) {
                return false;
            }
            return !!a.isDefault && a.locations.includes(location);
        }));
    }
    get hasToolsAgent() {
        return !!this._hasToolsAgentContextKey.get();
    }
    getContributedDefaultAgent(location) {
        return this._preferExtensionAgent(this.getAgents().filter(a => !!a.isDefault && a.locations.includes(location)));
    }
    _preferExtensionAgent(agents) {
        // We potentially have multiple agents on the same location,
        // contributed from core and from extensions.
        // This method will prefer the last extensions provided agent
        // falling back to the last core agent if no extension agent is found.
        return findLast(agents, agent => !agent.isCore) ?? agents.at(-1);
    }
    getAgent(id, includeDisabled = false) {
        if (!this._agentIsEnabled(id) && !includeDisabled) {
            return;
        }
        return this._agents.get(id)?.data;
    }
    _agentIsEnabled(idOrAgent) {
        const entry = typeof idOrAgent === 'string' ? this._agents.get(idOrAgent) : idOrAgent;
        return !entry?.data.when || this.contextKeyService.contextMatchesRules(ContextKeyExpr.deserialize(entry.data.when));
    }
    getAgentByFullyQualifiedId(id) {
        const agent = Iterable.find(this._agents.values(), a => getFullyQualifiedId(a.data) === id)?.data;
        if (agent && !this._agentIsEnabled(agent.id)) {
            return;
        }
        return agent;
    }
    /**
     * Returns all agent datas that exist- static registered and dynamic ones.
     */
    getAgents() {
        return Array.from(this._agents.values())
            .map(entry => entry.data)
            .filter(a => this._agentIsEnabled(a.id));
    }
    getActivatedAgents() {
        return Array.from(this._agents.values())
            .filter(a => !!a.impl)
            .filter(a => this._agentIsEnabled(a.data.id))
            .map(a => new MergedChatAgent(a.data, a.impl));
    }
    getAgentsByName(name) {
        return this._preferExtensionAgents(this.getAgents().filter(a => a.name === name));
    }
    _preferExtensionAgents(agents) {
        // We potentially have multiple agents on the same location,
        // contributed from core and from extensions.
        // This method will prefer the extensions provided agents
        // falling back to the original agents array extension agent is found.
        const extensionAgents = agents.filter(a => !a.isCore);
        return extensionAgents.length > 0 ? extensionAgents : agents;
    }
    agentHasDupeName(id) {
        const agent = this.getAgent(id);
        if (!agent) {
            return false;
        }
        return this.getAgentsByName(agent.name)
            .filter(a => a.extensionId.value !== agent.extensionId.value).length > 0;
    }
    async invokeAgent(id, request, progress, history, token) {
        const data = this._agents.get(id);
        if (!data?.impl) {
            throw new Error(`No activated agent with id "${id}"`);
        }
        return await data.impl.invoke(request, progress, history, token);
    }
    setRequestPaused(id, requestId, isPaused) {
        const data = this._agents.get(id);
        if (!data?.impl) {
            throw new Error(`No activated agent with id "${id}"`);
        }
        data.impl.setRequestPaused?.(requestId, isPaused);
    }
    async getFollowups(id, request, result, history, token) {
        const data = this._agents.get(id);
        if (!data?.impl) {
            throw new Error(`No activated agent with id "${id}"`);
        }
        if (!data.impl?.provideFollowups) {
            return [];
        }
        return data.impl.provideFollowups(request, result, history, token);
    }
    async getChatTitle(id, history, token) {
        const data = this._agents.get(id);
        if (!data?.impl) {
            throw new Error(`No activated agent with id "${id}"`);
        }
        if (!data.impl?.provideChatTitle) {
            return undefined;
        }
        return data.impl.provideChatTitle(history, token);
    }
    registerChatParticipantDetectionProvider(handle, provider) {
        this._chatParticipantDetectionProviders.set(handle, provider);
        return toDisposable(() => {
            this._chatParticipantDetectionProviders.delete(handle);
        });
    }
    hasChatParticipantDetectionProviders() {
        return this._chatParticipantDetectionProviders.size > 0;
    }
    async detectAgentOrCommand(request, history, options, token) {
        // TODO@joyceerhl should we have a selector to be able to narrow down which provider to use
        const provider = Iterable.first(this._chatParticipantDetectionProviders.values());
        if (!provider) {
            return;
        }
        const participants = this.getAgents().reduce((acc, a) => {
            if (a.locations.includes(options.location)) {
                acc.push({ participant: a.id, disambiguation: a.disambiguation ?? [] });
                for (const command of a.slashCommands) {
                    acc.push({ participant: a.id, command: command.name, disambiguation: command.disambiguation ?? [] });
                }
            }
            return acc;
        }, []);
        const result = await provider.provideParticipantDetection(request, history, { ...options, participants }, token);
        if (!result) {
            return;
        }
        const agent = this.getAgent(result.participant);
        if (!agent) {
            // Couldn't find a participant matching the participant detection result
            return;
        }
        if (!result.command) {
            return { agent };
        }
        const command = agent?.slashCommands.find(c => c.name === result.command);
        if (!command) {
            // Couldn't find a slash command matching the participant detection result
            return;
        }
        return { agent, command };
    }
};
ChatAgentService = __decorate([
    __param(0, IContextKeyService)
], ChatAgentService);
export { ChatAgentService };
export class MergedChatAgent {
    constructor(data, impl) {
        this.data = data;
        this.impl = impl;
    }
    get id() { return this.data.id; }
    get name() { return this.data.name ?? ''; }
    get fullName() { return this.data.fullName ?? ''; }
    get description() { return this.data.description ?? ''; }
    get extensionId() { return this.data.extensionId; }
    get extensionPublisherId() { return this.data.extensionPublisherId; }
    get extensionPublisherDisplayName() { return this.data.publisherDisplayName; }
    get extensionDisplayName() { return this.data.extensionDisplayName; }
    get isDefault() { return this.data.isDefault; }
    get isToolsAgent() { return this.data.isToolsAgent; }
    get isCore() { return this.data.isCore; }
    get metadata() { return this.data.metadata; }
    get slashCommands() { return this.data.slashCommands; }
    get locations() { return this.data.locations; }
    get disambiguation() { return this.data.disambiguation; }
    async invoke(request, progress, history, token) {
        return this.impl.invoke(request, progress, history, token);
    }
    setRequestPaused(requestId, isPaused) {
        if (this.impl.setRequestPaused) {
            this.impl.setRequestPaused(requestId, isPaused);
        }
    }
    async provideFollowups(request, result, history, token) {
        if (this.impl.provideFollowups) {
            return this.impl.provideFollowups(request, result, history, token);
        }
        return [];
    }
    provideWelcomeMessage(token) {
        if (this.impl.provideWelcomeMessage) {
            return this.impl.provideWelcomeMessage(token);
        }
        return undefined;
    }
    provideSampleQuestions(location, token) {
        if (this.impl.provideSampleQuestions) {
            return this.impl.provideSampleQuestions(location, token);
        }
        return undefined;
    }
    toJSON() {
        return this.data;
    }
}
export const IChatAgentNameService = createDecorator('chatAgentNameService');
let ChatAgentNameService = class ChatAgentNameService {
    static { ChatAgentNameService_1 = this; }
    static { this.StorageKey = 'chat.participantNameRegistry'; }
    constructor(productService, requestService, logService, storageService) {
        this.requestService = requestService;
        this.logService = logService;
        this.storageService = storageService;
        this.registry = observableValue(this, Object.create(null));
        this.disposed = false;
        if (!productService.chatParticipantRegistry) {
            return;
        }
        this.url = productService.chatParticipantRegistry;
        const raw = storageService.get(ChatAgentNameService_1.StorageKey, -1 /* StorageScope.APPLICATION */);
        try {
            this.registry.set(JSON.parse(raw ?? '{}'), undefined);
        }
        catch (err) {
            storageService.remove(ChatAgentNameService_1.StorageKey, -1 /* StorageScope.APPLICATION */);
        }
        this.refresh();
    }
    refresh() {
        if (this.disposed) {
            return;
        }
        this.update()
            .catch(err => this.logService.warn('Failed to fetch chat participant registry', err))
            .then(() => timeout(5 * 60 * 1000)) // every 5 minutes
            .then(() => this.refresh());
    }
    async update() {
        const context = await this.requestService.request({ type: 'GET', url: this.url }, CancellationToken.None);
        if (context.res.statusCode !== 200) {
            throw new Error('Could not get extensions report.');
        }
        const result = await asJson(context);
        if (!result || result.version !== 1) {
            throw new Error('Unexpected chat participant registry response.');
        }
        const registry = result.restrictedChatParticipants;
        this.registry.set(registry, undefined);
        this.storageService.store(ChatAgentNameService_1.StorageKey, JSON.stringify(registry), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    /**
     * Returns true if the agent is allowed to use this name
     */
    getAgentNameRestriction(chatAgentData) {
        if (chatAgentData.isCore) {
            return true; // core agents are always allowed to use any name
        }
        // TODO would like to use observables here but nothing uses it downstream and I'm not sure how to combine these two
        const nameAllowed = this.checkAgentNameRestriction(chatAgentData.name, chatAgentData).get();
        const fullNameAllowed = !chatAgentData.fullName || this.checkAgentNameRestriction(chatAgentData.fullName.replace(/\s/g, ''), chatAgentData).get();
        return nameAllowed && fullNameAllowed;
    }
    checkAgentNameRestriction(name, chatAgentData) {
        // Registry is a map of name to an array of extension publisher IDs or extension IDs that are allowed to use it.
        // Look up the list of extensions that are allowed to use this name
        const allowList = this.registry.map(registry => registry[name.toLowerCase()]);
        return allowList.map(allowList => {
            if (!allowList) {
                return true;
            }
            return allowList.some(id => equalsIgnoreCase(id, id.includes('.') ? chatAgentData.extensionId.value : chatAgentData.extensionPublisherId));
        });
    }
    dispose() {
        this.disposed = true;
    }
};
ChatAgentNameService = ChatAgentNameService_1 = __decorate([
    __param(0, IProductService),
    __param(1, IRequestService),
    __param(2, ILogService),
    __param(3, IStorageService)
], ChatAgentNameService);
export { ChatAgentNameService };
export function getFullyQualifiedId(chatAgentData) {
    return `${chatAgentData.extensionId.value}.${chatAgentData.id}`;
}
export function reviveSerializedAgent(raw) {
    const agent = 'name' in raw ?
        raw :
        {
            ...raw,
            name: raw.id,
        };
    // Fill in required fields that may be missing from old data
    if (!('extensionPublisherId' in agent)) {
        agent.extensionPublisherId = agent.extensionPublisher ?? '';
    }
    if (!('extensionDisplayName' in agent)) {
        agent.extensionDisplayName = '';
    }
    if (!('extensionId' in agent)) {
        agent.extensionId = new ExtensionIdentifier('');
    }
    return revive(agent);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFnZW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0QWdlbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQW1CLGdCQUFnQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDM0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDN0YsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2hFLE9BQU8sRUFBZSxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNyRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHakUsT0FBTyxFQUFFLGNBQWMsRUFBZSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7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