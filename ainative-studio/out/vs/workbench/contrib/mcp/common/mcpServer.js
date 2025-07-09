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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vbWNwU2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRixPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxVQUFVLEVBQWdDLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzlHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE9BQU8sRUFBRSx5QkFBeUIsRUFBNkIsbUJBQW1CLEVBQUUsaUJBQWlCLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3ZOLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBVyxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzlG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