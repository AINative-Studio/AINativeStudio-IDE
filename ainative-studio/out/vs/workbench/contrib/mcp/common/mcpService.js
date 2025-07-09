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
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { equals } from '../../../../base/common/objects.js';
import { autorun, observableValue, transaction } from '../../../../base/common/observable.js';
import { localize } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ILanguageModelToolsService } from '../../chat/common/languageModelToolsService.js';
import { IMcpRegistry } from './mcpRegistryTypes.js';
import { McpServer, McpServerMetadataCache } from './mcpServer.js';
import { McpServerDefinition } from './mcpTypes.js';
let McpService = class McpService extends Disposable {
    get lazyCollectionState() { return this._mcpRegistry.lazyCollectionState; }
    constructor(_instantiationService, _mcpRegistry, _toolsService, _logService) {
        super();
        this._instantiationService = _instantiationService;
        this._mcpRegistry = _mcpRegistry;
        this._toolsService = _toolsService;
        this._logService = _logService;
        this._servers = observableValue(this, []);
        this.servers = this._servers.map(servers => servers.map(s => s.object));
        this.userCache = this._register(_instantiationService.createInstance(McpServerMetadataCache, 0 /* StorageScope.PROFILE */));
        this.workspaceCache = this._register(_instantiationService.createInstance(McpServerMetadataCache, 1 /* StorageScope.WORKSPACE */));
        const updateThrottle = this._store.add(new RunOnceScheduler(() => this._updateCollectedServers(), 500));
        // Throttle changes so that if a collection is changed, or a server is
        // unregistered/registered, we don't stop servers unnecessarily.
        this._register(autorun(reader => {
            for (const collection of this._mcpRegistry.collections.read(reader)) {
                collection.serverDefinitions.read(reader);
            }
            updateThrottle.schedule(500);
        }));
    }
    resetCaches() {
        this.userCache.reset();
        this.workspaceCache.reset();
    }
    async activateCollections() {
        const collections = await this._mcpRegistry.discoverCollections();
        const collectionIds = new Set(collections.map(c => c.id));
        this._updateCollectedServers();
        // Discover any newly-collected servers with unknown tools
        const todo = [];
        for (const { object: server } of this._servers.get()) {
            if (collectionIds.has(server.collection.id)) {
                const state = server.toolsState.get();
                if (state === 0 /* McpServerToolsState.Unknown */) {
                    todo.push(server.start());
                }
            }
        }
        await Promise.all(todo);
    }
    _syncTools(server, store) {
        const tools = new Map();
        store.add(autorun(reader => {
            const toDelete = new Set(tools.keys());
            for (const tool of server.tools.read(reader)) {
                const existing = tools.get(tool.id);
                const collection = this._mcpRegistry.collections.get().find(c => c.id === server.collection.id);
                const toolData = {
                    id: tool.id,
                    source: { type: 'mcp', collectionId: server.collection.id, definitionId: server.definition.id },
                    icon: Codicon.tools,
                    displayName: tool.definition.name,
                    toolReferenceName: tool.definition.name,
                    modelDescription: tool.definition.description ?? '',
                    userDescription: tool.definition.description ?? '',
                    inputSchema: tool.definition.inputSchema,
                    canBeReferencedInPrompt: true,
                    supportsToolPicker: true,
                    runsInWorkspace: collection?.scope === 1 /* StorageScope.WORKSPACE */ || !!collection?.remoteAuthority,
                    tags: ['mcp'],
                };
                if (existing) {
                    if (!equals(existing.toolData, toolData)) {
                        existing.toolData = toolData;
                        existing.toolDispose.dispose();
                        existing.toolDispose = this._toolsService.registerToolData(toolData);
                    }
                    toDelete.delete(tool.id);
                }
                else {
                    tools.set(tool.id, {
                        toolData,
                        toolDispose: this._toolsService.registerToolData(toolData),
                        implDispose: this._toolsService.registerToolImplementation(tool.id, this._instantiationService.createInstance(McpToolImplementation, tool, server)),
                    });
                }
            }
            for (const id of toDelete) {
                const tool = tools.get(id);
                if (tool) {
                    tool.toolDispose.dispose();
                    tool.implDispose.dispose();
                    tools.delete(id);
                }
            }
        }));
        store.add(toDisposable(() => {
            for (const tool of tools.values()) {
                tool.toolDispose.dispose();
                tool.implDispose.dispose();
            }
        }));
    }
    _updateCollectedServers() {
        const definitions = this._mcpRegistry.collections.get().flatMap(collectionDefinition => collectionDefinition.serverDefinitions.get().map(serverDefinition => ({
            serverDefinition,
            collectionDefinition,
        })));
        const nextDefinitions = new Set(definitions);
        const currentServers = this._servers.get();
        const nextServers = [];
        const pushMatch = (match, rec) => {
            nextDefinitions.delete(match);
            nextServers.push(rec);
            const connection = rec.object.connection.get();
            // if the definition was modified, stop the server; it'll be restarted again on-demand
            if (connection && !McpServerDefinition.equals(connection.definition, match.serverDefinition)) {
                rec.object.stop();
                this._logService.debug(`MCP server ${rec.object.definition.id} stopped because the definition changed`);
            }
        };
        // Transfer over any servers that are still valid.
        for (const server of currentServers) {
            const match = definitions.find(d => defsEqual(server.object, d));
            if (match) {
                pushMatch(match, server);
            }
            else {
                server.dispose();
            }
        }
        // Create any new servers that are needed.
        for (const def of nextDefinitions) {
            const store = new DisposableStore();
            const object = this._instantiationService.createInstance(McpServer, def.collectionDefinition, def.serverDefinition, def.serverDefinition.roots, !!def.collectionDefinition.lazy, def.collectionDefinition.scope === 1 /* StorageScope.WORKSPACE */ ? this.workspaceCache : this.userCache);
            store.add(object);
            this._syncTools(object, store);
            nextServers.push({ object, dispose: () => store.dispose() });
        }
        transaction(tx => {
            this._servers.set(nextServers, tx);
        });
    }
    dispose() {
        this._servers.get().forEach(s => s.dispose());
        super.dispose();
    }
};
McpService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IMcpRegistry),
    __param(2, ILanguageModelToolsService),
    __param(3, ILogService)
], McpService);
export { McpService };
function defsEqual(server, def) {
    return server.collection.id === def.collectionDefinition.id && server.definition.id === def.serverDefinition.id;
}
let McpToolImplementation = class McpToolImplementation {
    constructor(_tool, _server, _productService) {
        this._tool = _tool;
        this._server = _server;
        this._productService = _productService;
    }
    async prepareToolInvocation(parameters) {
        const tool = this._tool;
        const server = this._server;
        const mcpToolWarning = localize('mcp.tool.warning', "{0} This tool is from \'{1}\' (MCP Server). Note that MCP servers or malicious conversation content may attempt to misuse '{2}' through tools. Please carefully review any requested actions.", '$(info)', server.definition.label, this._productService.nameShort);
        return {
            confirmationMessages: {
                title: localize('msg.title', "Run `{0}`", tool.definition.name, server.definition.label),
                message: new MarkdownString(localize('msg.msg', "{0}\n\n {1}", tool.definition.description, mcpToolWarning), { supportThemeIcons: true }),
                allowAutoConfirm: true,
            },
            invocationMessage: new MarkdownString(localize('msg.run', "Running `{0}`", tool.definition.name, server.definition.label)),
            pastTenseMessage: new MarkdownString(localize('msg.ran', "Ran `{0}` ", tool.definition.name, server.definition.label)),
            toolSpecificData: {
                kind: 'input',
                rawInput: parameters
            }
        };
    }
    async invoke(invocation, _countTokens, token) {
        const result = {
            content: []
        };
        const outputParts = [];
        const callResult = await this._tool.call(invocation.parameters, token);
        for (const item of callResult.content) {
            if (item.type === 'text') {
                result.content.push({
                    kind: 'text',
                    value: item.text
                });
                outputParts.push(item.text);
            }
            else {
                // TODO@jrieken handle different item types
            }
        }
        result.toolResultDetails = {
            input: JSON.stringify(invocation.parameters, undefined, 2),
            output: outputParts.join('\n')
        };
        return result;
    }
};
McpToolImplementation = __decorate([
    __param(2, IProductService)
], McpToolImplementation);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvY29tbW9uL21jcFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBMkIsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDMUgsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQWUsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzNHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRXhGLE9BQU8sRUFBdUIsMEJBQTBCLEVBQStFLE1BQU0sZ0RBQWdELENBQUM7QUFDOUwsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3JELE9BQU8sRUFBRSxTQUFTLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUNuRSxPQUFPLEVBQThELG1CQUFtQixFQUF1QixNQUFNLGVBQWUsQ0FBQztBQVU5SCxJQUFNLFVB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