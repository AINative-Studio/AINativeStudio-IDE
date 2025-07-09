/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equals } from '../../../../base/common/arrays.js';
import { DeferredPromise, IntervalTimer } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun } from '../../../../base/common/observable.js';
import { canLog, LogLevel } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { MpcResponseError } from './mcpTypes.js';
import { MCP } from './modelContextProtocol.js';
/**
 * Request handler for communicating with an MCP server.
 *
 * Handles sending requests and receiving responses, with automatic
 * handling of ping requests and typed client request methods.
 */
export class McpServerRequestHandler extends Disposable {
    set roots(roots) {
        if (!equals(this._roots, roots)) {
            this._roots = roots;
            if (this._hasAnnouncedRoots) {
                this.sendNotification({ method: 'notifications/roots/list_changed' });
                this._hasAnnouncedRoots = false;
            }
        }
    }
    get capabilities() {
        return this._serverInit.capabilities;
    }
    /**
     * Connects to the MCP server and does the initialization handshake.
     * @throws MpcResponseError if the server fails to initialize.
     */
    static async create(instaService, launch, logger, token) {
        const mcp = new McpServerRequestHandler(launch, logger);
        const store = new DisposableStore();
        try {
            const timer = store.add(new IntervalTimer());
            timer.cancelAndSet(() => {
                logger.info('Waiting for server to respond to `initialize` request...');
            }, 5000);
            await instaService.invokeFunction(async (accessor) => {
                const productService = accessor.get(IProductService);
                const initialized = await mcp.sendRequest({
                    method: 'initialize',
                    params: {
                        protocolVersion: MCP.LATEST_PROTOCOL_VERSION,
                        capabilities: {
                            roots: { listChanged: true },
                        },
                        clientInfo: {
                            name: productService.nameLong,
                            version: productService.version,
                        }
                    }
                }, token);
                mcp._serverInit = initialized;
                mcp.sendNotification({
                    method: 'notifications/initialized'
                });
            });
            return mcp;
        }
        catch (e) {
            mcp.dispose();
            throw e;
        }
        finally {
            store.dispose();
        }
    }
    constructor(launch, logger) {
        super();
        this.launch = launch;
        this.logger = logger;
        this._nextRequestId = 1;
        this._pendingRequests = new Map();
        this._hasAnnouncedRoots = false;
        this._roots = [];
        // Event emitters for server notifications
        this._onDidReceiveCancelledNotification = this._register(new Emitter());
        this.onDidReceiveCancelledNotification = this._onDidReceiveCancelledNotification.event;
        this._onDidReceiveProgressNotification = this._register(new Emitter());
        this.onDidReceiveProgressNotification = this._onDidReceiveProgressNotification.event;
        this._onDidChangeResourceList = this._register(new Emitter());
        this.onDidChangeResourceList = this._onDidChangeResourceList.event;
        this._onDidUpdateResource = this._register(new Emitter());
        this.onDidUpdateResource = this._onDidUpdateResource.event;
        this._onDidChangeToolList = this._register(new Emitter());
        this.onDidChangeToolList = this._onDidChangeToolList.event;
        this._onDidChangePromptList = this._register(new Emitter());
        this.onDidChangePromptList = this._onDidChangePromptList.event;
        this._register(launch.onDidReceiveMessage(message => this.handleMessage(message)));
        this._register(autorun(reader => {
            const state = launch.state.read(reader).state;
            // the handler will get disposed when the launch stops, but if we're still
            // create()'ing we need to make sure to cancel the initialize request.
            if (state === 3 /* McpConnectionState.Kind.Error */ || state === 0 /* McpConnectionState.Kind.Stopped */) {
                this.cancelAllRequests();
            }
        }));
    }
    /**
     * Send a client request to the server and return the response.
     *
     * @param request The request to send
     * @param token Cancellation token
     * @param timeoutMs Optional timeout in milliseconds
     * @returns A promise that resolves with the response
     */
    async sendRequest(request, token = CancellationToken.None) {
        if (this._store.isDisposed) {
            return Promise.reject(new CancellationError());
        }
        const id = this._nextRequestId++;
        // Create the full JSON-RPC request
        const jsonRpcRequest = {
            jsonrpc: MCP.JSONRPC_VERSION,
            id,
            ...request
        };
        const promise = new DeferredPromise();
        // Store the pending request
        this._pendingRequests.set(id, { promise });
        // Set up cancellation
        const cancelListener = token.onCancellationRequested(() => {
            if (!promise.isSettled) {
                this._pendingRequests.delete(id);
                this.sendNotification({ method: 'notifications/cancelled', params: { requestId: id } });
                promise.cancel();
            }
            cancelListener.dispose();
        });
        // Send the request
        this.send(jsonRpcRequest);
        const ret = promise.p.finally(() => {
            cancelListener.dispose();
            this._pendingRequests.delete(id);
        });
        return ret;
    }
    send(mcp) {
        if (canLog(this.logger.getLevel(), LogLevel.Debug)) { // avoid building the string if we don't need to
            this.logger.debug(`[editor -> server] ${JSON.stringify(mcp)}`);
        }
        this.launch.send(mcp);
    }
    /**
     * Handles paginated requests by making multiple requests until all items are retrieved.
     *
     * @param method The method name to call
     * @param getItems Function to extract the array of items from a result
     * @param initialParams Initial parameters
     * @param token Cancellation token
     * @returns Promise with all items combined
     */
    async sendRequestPaginated(method, getItems, initialParams, token = CancellationToken.None) {
        let allItems = [];
        let nextCursor = undefined;
        do {
            const params = {
                ...initialParams,
                cursor: nextCursor
            };
            const result = await this.sendRequest({ method, params }, token);
            allItems = allItems.concat(getItems(result));
            nextCursor = result.nextCursor;
        } while (nextCursor !== undefined && !token.isCancellationRequested);
        return allItems;
    }
    sendNotification(notification) {
        this.send({ ...notification, jsonrpc: MCP.JSONRPC_VERSION });
    }
    /**
     * Handle incoming messages from the server
     */
    handleMessage(message) {
        if (canLog(this.logger.getLevel(), LogLevel.Debug)) { // avoid building the string if we don't need to
            this.logger.debug(`[server <- editor] ${JSON.stringify(message)}`);
        }
        // Handle responses to our requests
        if ('id' in message) {
            if ('result' in message) {
                this.handleResult(message);
            }
            else if ('error' in message) {
                this.handleError(message);
            }
        }
        // Handle requests from the server
        if ('method' in message) {
            if ('id' in message) {
                this.handleServerRequest(message);
            }
            else {
                this.handleServerNotification(message);
            }
        }
    }
    /**
     * Handle successful responses
     */
    handleResult(response) {
        const request = this._pendingRequests.get(response.id);
        if (request) {
            this._pendingRequests.delete(response.id);
            request.promise.complete(response.result);
        }
    }
    /**
     * Handle error responses
     */
    handleError(response) {
        const request = this._pendingRequests.get(response.id);
        if (request) {
            this._pendingRequests.delete(response.id);
            request.promise.error(new MpcResponseError(response.error.message, response.error.code, response.error.data));
        }
    }
    /**
     * Handle incoming server requests
     */
    handleServerRequest(request) {
        switch (request.method) {
            case 'ping':
                return this.respondToRequest(request, this.handlePing(request));
            case 'roots/list':
                return this.respondToRequest(request, this.handleRootsList(request));
            default: {
                const errorResponse = {
                    jsonrpc: MCP.JSONRPC_VERSION,
                    id: request.id,
                    error: {
                        code: MCP.METHOD_NOT_FOUND,
                        message: `Method not found: ${request.method}`
                    }
                };
                this.send(errorResponse);
                break;
            }
        }
    }
    /**
     * Handle incoming server notifications
     */
    handleServerNotification(request) {
        switch (request.method) {
            case 'notifications/message':
                return this.handleLoggingNotification(request);
            case 'notifications/cancelled':
                this._onDidReceiveCancelledNotification.fire(request);
                return this.handleCancelledNotification(request);
            case 'notifications/progress':
                this._onDidReceiveProgressNotification.fire(request);
                return;
            case 'notifications/resources/list_changed':
                this._onDidChangeResourceList.fire();
                return;
            case 'notifications/resources/updated':
                this._onDidUpdateResource.fire(request);
                return;
            case 'notifications/tools/list_changed':
                this._onDidChangeToolList.fire();
                return;
            case 'notifications/prompts/list_changed':
                this._onDidChangePromptList.fire();
                return;
        }
    }
    handleCancelledNotification(request) {
        const pendingRequest = this._pendingRequests.get(request.params.requestId);
        if (pendingRequest) {
            this._pendingRequests.delete(request.params.requestId);
            pendingRequest.promise.cancel();
        }
    }
    handleLoggingNotification(request) {
        let contents = typeof request.params.data === 'string' ? request.params.data : JSON.stringify(request.params.data);
        if (request.params.logger) {
            contents = `${request.params.logger}: ${contents}`;
        }
        switch (request.params?.level) {
            case 'debug':
                this.logger.debug(contents);
                break;
            case 'info':
            case 'notice':
                this.logger.info(contents);
                break;
            case 'warning':
                this.logger.warn(contents);
                break;
            case 'error':
            case 'critical':
            case 'alert':
            case 'emergency':
                this.logger.error(contents);
                break;
            default:
                this.logger.info(contents);
                break;
        }
    }
    /**
     * Send a generic response to a request
     */
    respondToRequest(request, result) {
        const response = {
            jsonrpc: MCP.JSONRPC_VERSION,
            id: request.id,
            result
        };
        this.send(response);
    }
    /**
     * Send a response to a ping request
     */
    handlePing(_request) {
        return {};
    }
    /**
     * Send a response to a roots/list request
     */
    handleRootsList(_request) {
        this._hasAnnouncedRoots = true;
        return { roots: this._roots };
    }
    cancelAllRequests() {
        this._pendingRequests.forEach(pending => pending.promise.cancel());
        this._pendingRequests.clear();
    }
    dispose() {
        this.cancelAllRequests();
        super.dispose();
    }
    /**
     * Send an initialize request
     */
    initialize(params, token) {
        return this.sendRequest({ method: 'initialize', params }, token);
    }
    /**
     * List available resources
     */
    listResources(params, token) {
        return this.sendRequestPaginated('resources/list', result => result.resources, params, token);
    }
    /**
     * Read a specific resource
     */
    readResource(params, token) {
        return this.sendRequest({ method: 'resources/read', params }, token);
    }
    /**
     * List available resource templates
     */
    listResourceTemplates(params, token) {
        return this.sendRequestPaginated('resources/templates/list', result => result.resourceTemplates, params, token);
    }
    /**
     * Subscribe to resource updates
     */
    subscribe(params, token) {
        return this.sendRequest({ method: 'resources/subscribe', params }, token);
    }
    /**
     * Unsubscribe from resource updates
     */
    unsubscribe(params, token) {
        return this.sendRequest({ method: 'resources/unsubscribe', params }, token);
    }
    /**
     * List available prompts
     */
    listPrompts(params, token) {
        return this.sendRequestPaginated('prompts/list', result => result.prompts, params, token);
    }
    /**
     * Get a specific prompt
     */
    getPrompt(params, token) {
        return this.sendRequest({ method: 'prompts/get', params }, token);
    }
    /**
     * List available tools
     */
    listTools(params, token) {
        return this.sendRequestPaginated('tools/list', result => result.tools, params, token);
    }
    /**
     * Call a specific tool
     */
    callTool(params, token) {
        return this.sendRequest({ method: 'tools/call', params }, token);
    }
    /**
     * Set the logging level
     */
    setLevel(params, token) {
        return this.sendRequest({ method: 'logging/setLevel', params }, token);
    }
    /**
     * Find completions for an argument
     */
    complete(params, token) {
        return this.sendRequest({ method: 'completion/complete', params }, token);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmVyUmVxdWVzdEhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9tY3BTZXJ2ZXJSZXF1ZXN0SGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxhQUFhLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEUsT0FBTyxFQUFFLE1BQU0sRUFBVyxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFeEYsT0FBTyxFQUFzQixnQkFBZ0IsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNyRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFjaEQ7Ozs7O0dBS0c7QUFDSCxNQUFNLE9BQU8sdUJBQXdCLFNBQVEsVUFBVTtJQU90RCxJQUFXLEtBQUssQ0FBQyxLQUFpQjtRQUNqQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENB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