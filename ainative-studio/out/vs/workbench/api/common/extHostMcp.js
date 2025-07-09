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
import { importAMDNodeModule } from '../../../amdX.js';
import { DeferredPromise, Sequencer } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Lazy } from '../../../base/common/lazy.js';
import { Disposable, DisposableMap, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { extensionPrefixedIdentifier, McpServerLaunch } from '../../contrib/mcp/common/mcpTypes.js';
import { MainContext } from './extHost.protocol.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { LogLevel } from '../../../platform/log/common/log.js';
export const IExtHostMpcService = createDecorator('IExtHostMpcService');
let ExtHostMcpService = class ExtHostMcpService extends Disposable {
    constructor(extHostRpc) {
        super();
        this._initialProviderPromises = new Set();
        this._sseEventSources = this._register(new DisposableMap());
        this._eventSource = new Lazy(async () => {
            const es = await importAMDNodeModule('@c4312/eventsource-umd', 'dist/index.umd.js');
            return es.EventSource;
        });
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadMcp);
    }
    $startMcp(id, launch) {
        this._startMcp(id, McpServerLaunch.fromSerialized(launch));
    }
    _startMcp(id, launch) {
        if (launch.type === 2 /* McpServerTransportType.SSE */) {
            this._sseEventSources.set(id, new McpSSEHandle(this._eventSource.value, id, launch, this._proxy));
            return;
        }
        throw new Error('not implemented');
    }
    $stopMcp(id) {
        if (this._sseEventSources.has(id)) {
            this._sseEventSources.deleteAndDispose(id);
            this._proxy.$onDidChangeState(id, { state: 0 /* McpConnectionState.Kind.Stopped */ });
        }
    }
    $sendMessage(id, message) {
        this._sseEventSources.get(id)?.send(message);
    }
    async $waitForInitialCollectionProviders() {
        await Promise.all(this._initialProviderPromises);
    }
    /** {@link vscode.lm.registerMcpConfigurationProvider} */
    registerMcpConfigurationProvider(extension, id, provider) {
        const store = new DisposableStore();
        const metadata = extension.contributes?.modelContextServerCollections?.find(m => m.id === id);
        if (!metadata) {
            throw new Error(`MCP configuration providers must be registered in the contributes.modelContextServerCollections array within your package.json, but "${id}" was not`);
        }
        const mcp = {
            id: extensionPrefixedIdentifier(extension.identifier, id),
            isTrustedByDefault: true,
            label: metadata?.label ?? extension.displayName ?? extension.name,
            scope: 1 /* StorageScope.WORKSPACE */
        };
        const update = async () => {
            const list = await provider.provideMcpServerDefinitions(CancellationToken.None);
            function isSSEConfig(candidate) {
                return !!candidate.uri;
            }
            const servers = [];
            for (const item of list ?? []) {
                servers.push({
                    id: ExtensionIdentifier.toKey(extension.identifier),
                    label: item.label,
                    launch: isSSEConfig(item)
                        ? {
                            type: 2 /* McpServerTransportType.SSE */,
                            uri: item.uri,
                            headers: item.headers,
                        }
                        : {
                            type: 1 /* McpServerTransportType.Stdio */,
                            cwd: item.cwd,
                            args: item.args,
                            command: item.command,
                            env: item.env,
                            envFile: undefined,
                        }
                });
            }
            this._proxy.$upsertMcpCollection(mcp, servers);
        };
        store.add(toDisposable(() => {
            this._proxy.$deleteMcpCollection(mcp.id);
        }));
        if (provider.onDidChange) {
            store.add(provider.onDidChange(update));
        }
        const promise = new Promise(resolve => {
            setTimeout(() => update().finally(() => {
                this._initialProviderPromises.delete(promise);
                resolve();
            }), 0);
        });
        this._initialProviderPromises.add(promise);
        return store;
    }
};
ExtHostMcpService = __decorate([
    __param(0, IExtHostRpcService)
], ExtHostMcpService);
export { ExtHostMcpService };
class McpSSEHandle extends Disposable {
    constructor(eventSourceCtor, _id, launch, _proxy) {
        super();
        this._id = _id;
        this._proxy = _proxy;
        this._requestSequencer = new Sequencer();
        this._postEndpoint = new DeferredPromise();
        eventSourceCtor.then(EventSourceCtor => this._attach(EventSourceCtor, launch));
    }
    _attach(EventSourceCtor, launch) {
        if (this._store.isDisposed) {
            return;
        }
        const eventSource = new EventSourceCtor(launch.uri.toString(), {
            // recommended way to do things https://github.com/EventSource/eventsource?tab=readme-ov-file#setting-http-request-headers
            fetch: (input, init) => fetch(input, {
                ...init,
                headers: {
                    ...Object.fromEntries(launch.headers),
                    ...init?.headers,
                },
            }).then(async (res) => {
                // we get more details on failure at this point, so handle it explicitly:
                if (res.status >= 300) {
                    this._proxy.$onDidChangeState(this._id, { state: 3 /* McpConnectionState.Kind.Error */, message: `${res.status} status connecting to ${launch.uri}: ${await this._getErrText(res)}` });
                    eventSource.close();
                }
                return res;
            }, err => {
                this._proxy.$onDidChangeState(this._id, { state: 3 /* McpConnectionState.Kind.Error */, message: `Error connecting to ${launch.uri}: ${String(err)}` });
                eventSource.close();
                return Promise.reject(err);
            })
        });
        this._register(toDisposable(() => eventSource.close()));
        // https://github.com/modelcontextprotocol/typescript-sdk/blob/0fa2397174eba309b54575294d56754c52b13a65/src/server/sse.ts#L52
        eventSource.addEventListener('endpoint', e => {
            this._postEndpoint.complete(new URL(e.data, launch.uri.toString()).toString());
        });
        // https://github.com/modelcontextprotocol/typescript-sdk/blob/0fa2397174eba309b54575294d56754c52b13a65/src/server/sse.ts#L133
        eventSource.addEventListener('message', e => {
            this._proxy.$onDidReceiveMessage(this._id, e.data);
        });
        eventSource.addEventListener('open', () => {
            this._proxy.$onDidChangeState(this._id, { state: 2 /* McpConnectionState.Kind.Running */ });
        });
        eventSource.addEventListener('error', (err) => {
            this._postEndpoint.cancel();
            this._proxy.$onDidChangeState(this._id, {
                state: 3 /* McpConnectionState.Kind.Error */,
                message: `Error connecting to ${launch.uri}: ${err.code || 0} ${err.message || JSON.stringify(err)}`,
            });
            eventSource.close();
        });
    }
    async send(message) {
        // only the sending of the request needs to be sequenced
        try {
            const res = await this._requestSequencer.queue(async () => {
                const endpoint = await this._postEndpoint.p;
                const asBytes = new TextEncoder().encode(message);
                return fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': String(asBytes.length),
                    },
                    body: asBytes,
                });
            });
            if (res.status >= 300) {
                this._proxy.$onDidPublishLog(this._id, LogLevel.Warning, `${res.status} status sending message to ${this._postEndpoint}: ${await this._getErrText(res)}`);
            }
        }
        catch (err) {
            // ignored
        }
    }
    async _getErrText(res) {
        try {
            return await res.text();
        }
        catch {
            return res.statusText;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE1jcC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0TWNwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxlQUFlLEVBQUUsU0FBUyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMxSCxPQUFPLEVBQUUsbUJBQW1CLEVBQXlCLE1BQU0sbURBQW1ELENBQUM7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRTFGLE9BQU8sRUFBRSwyQkFBMkIsRUFBb0UsZUFBZSxFQUFpRCxNQUFNLHNDQUFzQyxDQUFDO0FBQ3JOLE9BQU8sRUFBbUIsV0FBVyxFQUFzQixNQUFNLHVCQUF1QixDQUFDO0FBQ3pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUUvRCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxlQUFlLENBQXFCLG9CQUFvQixDQUFDLENBQUM7QUFNckYsSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBa0IsU0FBUSxVQUFVO0lBU2hELFlBQ3FCLFVBQThCO1FBRWxELEtBQUssRUFBRSxDQUFDO1FB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