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
import { raceCancellationError, Sequencer } from '../../../../base/common/async.js';
import * as json from '../../../../base/common/json.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { LRUCache } from '../../../../base/common/map.js';
import { autorun, autorunWithStore, derived, disposableObservableValue, observableFromEvent, ObservablePromise, observableValue, transaction } from '../../../../base/common/observable.js';
import { basename } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ILoggerService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IOutputService } from '../../../services/output/common/output.js';
import { mcpActivationEvent } from './mcpConfiguration.js';
import { IMcpRegistry } from './mcpRegistryTypes.js';
import { extensionMcpCollectionPrefix, McpConnectionFailedError, McpConnectionState } from './mcpTypes.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { localize } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
const toolInvalidCharRe = /[^a-z0-9_-]/gi;
let McpServerMetadataCache = class McpServerMetadataCache extends Disposable {
    constructor(scope, storageService) {
        super();
        this.didChange = false;
        this.cache = new LRUCache(128);
        this.extensionServers = new Map();
        const storageKey = 'mcpToolCache';
        this._register(storageService.onWillSaveState(() => {
            if (this.didChange) {
                storageService.store(storageKey, {
                    extensionServers: [...this.extensionServers],
                    serverTools: this.cache.toJSON(),
                }, scope, 1 /* StorageTarget.MACHINE */);
                this.didChange = false;
            }
        }));
        try {
            const cached = storageService.getObject(storageKey, scope);
            this.extensionServers = new Map(cached?.extensionServers ?? []);
            cached?.serverTools?.forEach(([k, v]) => this.cache.set(k, v));
        }
        catch {
            // ignored
        }
    }
    /** Resets the cache for tools and extension servers */
    reset() {
        this.cache.clear();
        this.extensionServers.clear();
        this.didChange = true;
    }
    /** Gets cached tools for a server (used before a server is running) */
    getTools(definitionId) {
        return this.cache.get(definitionId)?.tools;
    }
    /** Sets cached tools for a server */
    storeTools(definitionId, tools) {
        this.cache.set(definitionId, { ...this.cache.get(definitionId), tools });
        this.didChange = true;
    }
    /** Gets cached servers for a collection (used for extensions, before the extension activates) */
    getServers(collectionId) {
        return this.extensionServers.get(collectionId);
    }
    /** Sets cached servers for a collection */
    storeServers(collectionId, entry) {
        if (entry) {
            this.extensionServers.set(collectionId, entry);
        }
        else {
            this.extensionServers.delete(collectionId);
        }
        this.didChange = true;
    }
};
McpServerMetadataCache = __decorate([
    __param(1, IStorageService)
], McpServerMetadataCache);
export { McpServerMetadataCache };
let McpServer = class McpServer extends Disposable {
    get toolsFromCache() {
        return this._toolCache.getTools(this.definition.id);
    }
    get trusted() {
        return this._mcpRegistry.getTrust(this.collection);
    }
    constructor(collection, definition, explicitRoots, _requiresExtensionActivation, _toolCache, _mcpRegistry, workspacesService, _extensionService, _loggerService, _outputService, _telemetryService, _commandService, _instantiationService) {
        super();
        this.collection = collection;
        this.definition = definition;
        this._requiresExtensionActivation = _requiresExtensionActivation;
        this._toolCache = _toolCache;
        this._mcpRegistry = _mcpRegistry;
        this._extensionService = _extensionService;
        this._loggerService = _loggerService;
        this._outputService = _outputService;
        this._telemetryService = _telemetryService;
        this._commandService = _commandService;
        this._instantiationService = _instantiationService;
        this._connectionSequencer = new Sequencer();
        this._connection = this._register(disposableObservableValue(this, undefined));
        this.connection = this._connection;
        this.connectionState = derived(reader => this._connection.read(reader)?.state.read(reader) ?? { state: 0 /* McpConnectionState.Kind.Stopped */ });
        this.toolsFromServerPromise = observableValue(this, undefined);
        this.toolsFromServer = derived(reader => this.toolsFromServerPromise.read(reader)?.promiseResult.read(reader)?.data);
        this.toolsState = derived(reader => {
            const fromServer = this.toolsFromServerPromise.read(reader);
            const connectionState = this.connectionState.read(reader);
            const isIdle = McpConnectionState.canBeStarted(connectionState.state) && !fromServer;
            if (isIdle) {
                return this.toolsFromCache ? 1 /* McpServerToolsState.Cached */ : 0 /* McpServerToolsState.Unknown */;
            }
            const fromServerResult = fromServer?.promiseResult.read(reader);
            if (!fromServerResult) {
                return this.toolsFromCache ? 3 /* McpServerToolsState.RefreshingFromCached */ : 2 /* McpServerToolsState.RefreshingFromUnknown */;
            }
            return fromServerResult.error ? (this.toolsFromCache ? 1 /* McpServerToolsState.Cached */ : 0 /* McpServerToolsState.Unknown */) : 4 /* McpServerToolsState.Live */;
        });
        this._loggerId = `mcpServer.${definition.id}`;
        this._logger = this._register(_loggerService.createLogger(this._loggerId, { hidden: true, name: `MCP: ${definition.label}` }));
        // If the logger is disposed but not deregistered, then the disposed instance
        // is reused and no-ops. todo@sandy081 this seems like a bug.
        this._register(toDisposable(() => _loggerService.deregisterLogger(this._loggerId)));
        // 1. Reflect workspaces into the MCP roots
        const workspaces = explicitRoots
            ? observableValue(this, explicitRoots.map(uri => ({ uri, name: basename(uri) })))
            : observableFromEvent(this, workspacesService.onDidChangeWorkspaceFolders, () => workspacesService.getWorkspace().folders);
        this._register(autorunWithStore(reader => {
            const cnx = this._connection.read(reader)?.handler.read(reader);
            if (!cnx) {
                return;
            }
            cnx.roots = workspaces.read(reader).map(wf => ({
                uri: wf.uri.toString(),
                name: wf.name,
            }));
        }));
        // 2. Populate this.tools when we connect to a server.
        this._register(autorunWithStore((reader, store) => {
            const cnx = this._connection.read(reader)?.handler.read(reader);
            if (cnx) {
                this.populateLiveData(cnx, store);
            }
            else {
                this.resetLiveData();
            }
        }));
        // 3. Update the cache when tools update
        this._register(autorun(reader => {
            const tools = this.toolsFromServer.read(reader);
            if (tools) {
                this._toolCache.storeTools(definition.id, tools);
            }
        }));
        // 4. Publish tools
        const toolPrefix = this._mcpRegistry.collectionToolPrefix(this.collection);
        this.tools = derived(reader => {
            const serverTools = this.toolsFromServer.read(reader);
            const definitions = serverTools ?? this.toolsFromCache ?? [];
            const prefix = toolPrefix.read(reader);
            return definitions.map(def => new McpTool(this, prefix, def));
        });
    }
    showOutput() {
        this._loggerService.setVisibility(this._loggerId, true);
        this._outputService.showChannel(this._loggerId);
    }
    start(isFromInteraction) {
        return this._connectionSequencer.queue(async () => {
            const activationEvent = mcpActivationEvent(this.collection.id.slice(extensionMcpCollectionPrefix.length));
            if (this._requiresExtensionActivation && !this._extensionService.activationEventIsDone(activationEvent)) {
                await this._extensionService.activateByEvent(activationEvent);
                await Promise.all(this._mcpRegistry.delegates
                    .map(r => r.waitForInitialProviderPromises()));
                // This can happen if the server was created from a cached MCP server seen
                // from an extension, but then it wasn't registered when the extension activated.
                if (this._store.isDisposed) {
                    return { state: 0 /* McpConnectionState.Kind.Stopped */ };
                }
            }
            let connection = this._connection.get();
            if (connection && McpConnectionState.canBeStarted(connection.state.get().state)) {
                connection.dispose();
                connection = undefined;
                this._connection.set(connection, undefined);
            }
            if (!connection) {
                connection = await this._mcpRegistry.resolveConnection({
                    logger: this._logger,
                    collectionRef: this.collection,
                    definitionRef: this.definition,
                    forceTrust: isFromInteraction,
                });
                if (!connection) {
                    return { state: 0 /* McpConnectionState.Kind.Stopped */ };
                }
                if (this._store.isDisposed) {
                    connection.dispose();
                    return { state: 0 /* McpConnectionState.Kind.Stopped */ };
                }
                this._connection.set(connection, undefined);
            }
            const start = Date.now();
            const state = await connection.start();
            this._telemetryService.publicLog2('mcp/serverBootState', {
                state: McpConnectionState.toKindString(state.state),
                time: Date.now() - start,
            });
            return state;
        });
    }
    stop() {
        return this._connection.get()?.stop() || Promise.resolve();
    }
    resetLiveData() {
        transaction(tx => {
            this.toolsFromServerPromise.set(undefined, tx);
        });
    }
    async _normalizeTool(originalTool) {
        const tool = { ...originalTool, serverToolName: originalTool.name };
        if (!tool.description) {
            // Ensure a description is provided for each tool, #243919
            this._logger.warn(`Tool ${tool.name} does not have a description. Tools must be accurately described to be called`);
            tool.description = '<empty>';
        }
        if (toolInvalidCharRe.test(tool.name)) {
            this._logger.warn(`Tool ${JSON.stringify(tool.name)} is invalid. Tools names may only contain [a-z0-9_-]`);
            tool.name = tool.name.replace(toolInvalidCharRe, '_');
        }
        let diagnostics = [];
        const toolJson = JSON.stringify(tool.inputSchema);
        try {
            const schemaUri = URI.parse('https://json-schema.org/draft-07/schema');
            diagnostics = await this._commandService.executeCommand('json.validate', schemaUri, toolJson) || [];
        }
        catch (e) {
            // ignored (error in json extension?);
        }
        if (!diagnostics.length) {
            return tool;
        }
        // because it's all one line from JSON.stringify, we can treat characters as offsets.
        const tree = json.parseTree(toolJson);
        const messages = diagnostics.map(d => {
            const node = json.findNodeAtOffset(tree, d.range[0].character);
            const path = node && `/${json.getNodePath(node).join('/')}`;
            return d.message + (path ? ` (at ${path})` : '');
        });
        return { error: messages };
    }
    async _getValidatedTools(handler, tools) {
        let error = '';
        const validations = await Promise.all(tools.map(t => this._normalizeTool(t)));
        const validated = [];
        for (const [i, result] of validations.entries()) {
            if ('error' in result) {
                error += localize('mcpBadSchema.tool', 'Tool `{0}` has invalid JSON parameters:', tools[i].name) + '\n';
                for (const message of result.error) {
                    error += `\t- ${message}\n`;
                }
                error += `\t- Schema: ${JSON.stringify(tools[i].inputSchema)}\n\n`;
            }
            else {
                validated.push(result);
            }
        }
        if (error) {
            handler.logger.warn(`${tools.length - validated.length} tools have invalid JSON schemas and will be omitted`);
            warnInvalidTools(this._instantiationService, this.definition.label, error);
        }
        return validated;
    }
    populateLiveData(handler, store) {
        const cts = new CancellationTokenSource();
        store.add(toDisposable(() => cts.dispose(true)));
        // todo: add more than just tools here
        const updateTools = (tx) => {
            const toolPromise = handler.capabilities.tools ? handler.listTools({}, cts.token) : Promise.resolve([]);
            const toolPromiseSafe = toolPromise.then(async (tools) => {
                handler.logger.info(`Discovered ${tools.length} tools`);
                return this._getValidatedTools(handler, tools);
            });
            this.toolsFromServerPromise.set(new ObservablePromise(toolPromiseSafe), tx);
            return [toolPromise];
        };
        store.add(handler.onDidChangeToolList(() => {
            handler.logger.info('Tool list changed, refreshing tools...');
            updateTools(undefined);
        }));
        let promises;
        transaction(tx => {
            promises = updateTools(tx);
        });
        Promise.all(promises).then(([tools]) => {
            this._telemetryService.publicLog2('mcp/serverBoot', {
                supportsLogging: !!handler.capabilities.logging,
                supportsPrompts: !!handler.capabilities.prompts,
                supportsResources: !!handler.capabilities.resources,
                toolCount: tools.length,
            });
        });
    }
    /**
     * Helper function to call the function on the handler once it's online. The
     * connection started if it is not already.
     */
    async callOn(fn, token = CancellationToken.None) {
        await this.start(); // idempotent
        let ranOnce = false;
        let d;
        const callPromise = new Promise((resolve, reject) => {
            d = autorun(reader => {
                const connection = this._connection.read(reader);
                if (!connection || ranOnce) {
                    return;
                }
                const handler = connection.handler.read(reader);
                if (!handler) {
                    const state = connection.state.read(reader);
                    if (state.state === 3 /* McpConnectionState.Kind.Error */) {
                        reject(new McpConnectionFailedError(`MCP server could not be started: ${state.message}`));
                        return;
                    }
                    else if (state.state === 0 /* McpConnectionState.Kind.Stopped */) {
                        reject(new McpConnectionFailedError('MCP server has stopped'));
                        return;
                    }
                    else {
                        // keep waiting for handler
                        return;
                    }
                }
                resolve(fn(handler));
                ranOnce = true; // aggressive prevent multiple racey calls, don't dispose because autorun is sync
            });
        });
        return raceCancellationError(callPromise, token).finally(() => d.dispose());
    }
};
McpServer = __decorate([
    __param(5, IMcpRegistry),
    __param(6, IWorkspaceContextService),
    __param(7, IExtensionService),
    __param(8, ILoggerService),
    __param(9, IOutputService),
    __param(10, ITelemetryService),
    __param(11, ICommandService),
    __param(12, IInstantiationService)
], McpServer);
export { McpServer };
export class McpTool {
    get definition() { return this._definition; }
    constructor(_server, idPrefix, _definition) {
        this._server = _server;
        this._definition = _definition;
        this.id = (idPrefix + _definition.name).replaceAll('.', '_');
    }
    call(params, token) {
        // serverToolName is always set now, but older cache entries (from 1.99-Insiders) may not have it.
        const name = this._definition.serverToolName ?? this._definition.name;
        return this._server.callOn(h => h.callTool({ name, arguments: params }), token);
    }
}
function warnInvalidTools(instaService, serverName, errorText) {
    instaService.invokeFunction((accessor) => {
        const notificationService = accessor.get(INotificationService);
        const editorService = accessor.get(IEditorService);
        notificationService.notify({
            severity: Severity.Warning,
            message: localize('mcpBadSchema', 'MCP server `{0}` has tools with invalid parameters which will be omitted.', serverName),
            actions: {
                primary: [{
                        class: undefined,
                        enabled: true,
                        id: 'mcpBadSchema.show',
                        tooltip: '',
                        label: localize('mcpBadSchema.show', 'Show'),
                        run: () => {
                            editorService.openEditor({
                                resource: undefined,
                                contents: errorText,
                            });
                        }
                    }]
            }
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9tY3BTZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BGLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLFVBQVUsRUFBZ0MsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDOUcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLHlCQUF5QixFQUE2QixtQkFBbUIsRUFBRSxpQkFBaUIsRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDdk4sT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFXLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUYs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