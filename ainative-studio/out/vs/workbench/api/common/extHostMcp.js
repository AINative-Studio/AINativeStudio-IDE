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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE1jcC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RNY3AudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDdkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDcEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzFILE9BQU8sRUFBRSxtQkFBbUIsRUFBeUIsTUFBTSxtREFBbUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFFMUYsT0FBTyxFQUFFLDJCQUEyQixFQUFvRSxlQUFlLEVBQWlELE1BQU0sc0NBQXNDLENBQUM7QUFDck4sT0FBTyxFQUFtQixXQUFXLEVBQXNCLE1BQU0sdUJBQXVCLENBQUM7QUFDekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRS9ELE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLGVBQWUsQ0FBcUIsb0JBQW9CLENBQUMsQ0FBQztBQU1yRixJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFrQixTQUFRLFVBQVU7SUFTaEQsWUFDcUIsVUFBOEI7UUFFbEQsS0FBSyxFQUFFLENBQUM7UUFWUSw2QkFBd0IsR0FBRyxJQUFJLEdBQUcsRUFBaUIsQ0FBQztRQUNwRCxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxFQUF3QixDQUFDLENBQUM7UUFDN0UsaUJBQVksR0FBRyxJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRTtZQUNuRCxNQUFNLEVBQUUsR0FBRyxNQUFNLG1CQUFtQixDQUFZLHdCQUF3QixFQUFFLG1CQUFtQixDQUFDLENBQUM7WUFDL0YsT0FBTyxFQUFFLENBQUMsV0FBVyxDQUFDO1FBQ3ZCLENBQUMsQ0FBQyxDQUFDO1FBTUYsSUFBSSxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUM5RCxDQUFDO0lBRUQsU0FBUyxDQUFDLEVBQVUsRUFBRSxNQUFrQztRQUN2RCxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxlQUFlLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDNUQsQ0FBQztJQUVTLFNBQVMsQ0FBQyxFQUFVLEVBQUUsTUFBdUI7UUFDdEQsSUFBSSxNQUFNLENBQUMsSUFBSSx1Q0FBK0IsRUFBRSxDQUFDO1lBQ2hELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDbEcsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELFFBQVEsQ0FBQyxFQUFVO1FBQ2xCLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUMzQyxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUsseUNBQWlDLEVBQUUsQ0FBQyxDQUFDO1FBQy9FLENBQUM7SUFDRixDQUFDO0lBRUQsWUFBWSxDQUFDLEVBQVUsRUFBRSxPQUFlO1FBQ3ZDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFRCxLQUFLLENBQUMsa0NBQWtDO1FBQ3ZDLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBRUQseURBQXlEO0lBQ2xELGdDQUFnQyxDQUFDLFNBQWdDLEVBQUUsRUFBVSxFQUFFLFFBQXlDO1FBQzlILE1BQU0sS0FBSyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFFcEMsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLFdBQVcsRUFBRSw2QkFBNkIsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQzlGLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsd0lBQXdJLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDeEssQ0FBQztRQUVELE1BQU0sR0FBRyxHQUF3QztZQUNoRCxFQUFFLEVBQUUsMkJBQTJCLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDekQsa0JBQWtCLEVBQUUsSUFBSTtZQUN4QixLQUFLLEVBQUUsUUFBUSxFQUFFLEtBQUssSUFBSSxTQUFTLENBQUMsV0FBVyxJQUFJLFNBQVMsQ0FBQyxJQUFJO1lBQ2pFLEtBQUssZ0NBQXdCO1NBQzdCLENBQUM7UUFFRixNQUFNLE1BQU0sR0FBRyxLQUFLLElBQUksRUFBRTtZQUV6QixNQUFNLElBQUksR0FBRyxNQUFNLFFBQVEsQ0FBQywyQkFBMkIsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUVoRixTQUFTLFdBQVcsQ0FBQyxTQUFxQztnQkFDekQsT0FBTyxDQUFDLENBQUUsU0FBMkMsQ0FBQyxHQUFHLENBQUM7WUFDM0QsQ0FBQztZQUVELE1BQU0sT0FBTyxHQUEwQixFQUFFLENBQUM7WUFFMUMsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLElBQUksRUFBRSxFQUFFLENBQUM7Z0JBQy9CLE9BQU8sQ0FBQyxJQUFJLENBQUM7b0JBQ1osRUFBRSxFQUFFLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDO29CQUNuRCxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7b0JBQ2pCLE1BQU0sRUFBRSxXQUFXLENBQUMsSUFBSSxDQUFDO3dCQUN4QixDQUFDLENBQUM7NEJBQ0QsSUFBSSxvQ0FBNEI7NEJBQ2hDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRzs0QkFDYixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87eUJBQ3JCO3dCQUNELENBQUMsQ0FBQzs0QkFDRCxJQUFJLHNDQUE4Qjs0QkFDbEMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHOzRCQUNiLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTs0QkFDZixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87NEJBQ3JCLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRzs0QkFDYixPQUFPLEVBQUUsU0FBUzt5QkFDbEI7aUJBQ0YsQ0FBQyxDQUFDO1lBQ0osQ0FBQztZQUVELElBQUksQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2hELENBQUMsQ0FBQztRQUVGLEtBQUssQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUMzQixJQUFJLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMxQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDMUIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDekMsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLElBQUksT0FBTyxDQUFPLE9BQU8sQ0FBQyxFQUFFO1lBQzNDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFO2dCQUN0QyxJQUFJLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUM5QyxPQUFPLEVBQUUsQ0FBQztZQUNYLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ1IsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRTNDLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztDQUNELENBQUE7QUFqSFksaUJBQWlCO0lBVTNCLFdBQUEsa0JBQWtCLENBQUE7R0FWUixpQkFBaUIsQ0FpSDdCOztBQUVELE1BQU0sWUFBYSxTQUFRLFVBQVU7SUFHcEMsWUFDQyxlQUErQyxFQUM5QixHQUFXLEVBQzVCLE1BQTZCLEVBQ1osTUFBMEI7UUFFM0MsS0FBSyxFQUFFLENBQUM7UUFKUyxRQUFHLEdBQUgsR0FBRyxDQUFRO1FBRVgsV0FBTSxHQUFOLE1BQU0sQ0FBb0I7UUFOM0Isc0JBQWlCLEdBQUcsSUFBSSxTQUFTLEVBQUUsQ0FBQztRQUNwQyxrQkFBYSxHQUFHLElBQUksZUFBZSxFQUFVLENBQUM7UUFROUQsZUFBZSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDaEYsQ0FBQztJQUVPLE9BQU8sQ0FBQyxlQUFzQyxFQUFFLE1BQTZCO1FBQ3BGLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUM1QixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDOUQsMEhBQTBIO1lBQzFILEtBQUssRUFBRSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUN0QixLQUFLLENBQUMsS0FBSyxFQUFFO2dCQUNaLEdBQUcsSUFBSTtnQkFDUCxPQUFPLEVBQUU7b0JBQ1IsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7b0JBQ3JDLEdBQUcsSUFBSSxFQUFFLE9BQU87aUJBQ2hCO2FBQ0QsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsR0FBRyxFQUFDLEVBQUU7Z0JBQ25CLHlFQUF5RTtnQkFDekUsSUFBSSxHQUFHLENBQUMsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDO29CQUN2QixJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxLQUFLLHVDQUErQixFQUFFLE9BQU8sRUFBRSxHQUFHLEdBQUcsQ0FBQyxNQUFNLHlCQUF5QixNQUFNLENBQUMsR0FBRyxLQUFLLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDL0ssV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNyQixDQUFDO2dCQUNELE9BQU8sR0FBRyxDQUFDO1lBQ1osQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFO2dCQUNSLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLEtBQUssdUNBQStCLEVBQUUsT0FBTyxFQUFFLHVCQUF1QixNQUFNLENBQUMsR0FBRyxLQUFLLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFFaEosV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNwQixPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDNUIsQ0FBQyxDQUFDO1NBQ0gsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV4RCw2SEFBNkg7UUFDN0gsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRTtZQUM1QyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ2hGLENBQUMsQ0FBQyxDQUFDO1FBRUgsOEhBQThIO1FBQzlILFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUU7WUFDM0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwRCxDQUFDLENBQUMsQ0FBQztRQUVILFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFO1lBQ3pDLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLEtBQUsseUNBQWlDLEVBQUUsQ0FBQyxDQUFDO1FBQ3JGLENBQUMsQ0FBQyxDQUFDO1FBRUgsV0FBVyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQzdDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUN2QyxLQUFLLHVDQUErQjtnQkFDcEMsT0FBTyxFQUFFLHVCQUF1QixNQUFNLENBQUMsR0FBRyxLQUFLLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRTthQUNwRyxDQUFDLENBQUM7WUFDSCxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDckIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFlO1FBQ3pCLHdEQUF3RDtRQUN4RCxJQUFJLENBQUM7WUFDSixNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUU7Z0JBQ3pELE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0JBQzVDLE1BQU0sT0FBTyxHQUFHLElBQUksV0FBVyxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUVsRCxPQUFPLEtBQUssQ0FBQyxRQUFRLEVBQUU7b0JBQ3RCLE1BQU0sRUFBRSxNQUFNO29CQUNkLE9BQU8sRUFBRTt3QkFDUixjQUFjLEVBQUUsa0JBQWtCO3dCQUNsQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztxQkFDeEM7b0JBQ0QsSUFBSSxFQUFFLE9BQU87aUJBQ2IsQ0FBQyxDQUFDO1lBQ0osQ0FBQyxDQUFDLENBQUM7WUFFSCxJQUFJLEdBQUcsQ0FBQyxNQUFNLElBQUksR0FBRyxFQUFFLENBQUM7Z0JBQ3ZCLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsT0FBTyxFQUFFLEdBQUcsR0FBRyxDQUFDLE1BQU0sOEJBQThCLElBQUksQ0FBQyxhQUFhLEtBQUssTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUMzSixDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCxVQUFVO1FBQ1gsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQWE7UUFDdEMsSUFBSSxDQUFDO1lBQ0osT0FBTyxNQUFNLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN6QixDQUFDO1FBQUMsTUFBTSxDQUFDO1lBQ1IsT0FBTyxHQUFHLENBQUMsVUFBVSxDQUFDO1FBQ3ZCLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==