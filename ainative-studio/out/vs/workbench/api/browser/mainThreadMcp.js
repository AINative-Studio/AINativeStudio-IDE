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
import { disposableTimeout } from '../../../base/common/async.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableMap, DisposableStore, MutableDisposable } from '../../../base/common/lifecycle.js';
import { autorun, observableValue } from '../../../base/common/observable.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { LogLevel } from '../../../platform/log/common/log.js';
import { observableConfigValue } from '../../../platform/observable/common/platformObservableUtils.js';
import { mcpEnabledSection } from '../../contrib/mcp/common/mcpConfiguration.js';
import { IMcpRegistry } from '../../contrib/mcp/common/mcpRegistryTypes.js';
import { McpConnectionState, McpServerDefinition } from '../../contrib/mcp/common/mcpTypes.js';
import { extensionHostKindToString } from '../../services/extensions/common/extensionHostKind.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
let MainThreadMcp = class MainThreadMcp extends Disposable {
    constructor(_extHostContext, _mcpRegistry, configurationService) {
        super();
        this._extHostContext = _extHostContext;
        this._mcpRegistry = _mcpRegistry;
        this._serverIdCounter = 0;
        this._servers = new Map();
        this._collectionDefinitions = this._register(new DisposableMap());
        const proxy = _extHostContext.getProxy(ExtHostContext.ExtHostMcp);
        this._mcpEnabled = observableConfigValue(mcpEnabledSection, true, configurationService);
        this._register(this._mcpRegistry.registerDelegate({
            // Prefer Node.js extension hosts when they're available. No CORS issues etc.
            priority: _extHostContext.extensionHostKind === 2 /* ExtensionHostKind.LocalWebWorker */ ? 0 : 1,
            waitForInitialProviderPromises() {
                return proxy.$waitForInitialCollectionProviders();
            },
            canStart(collection, serverDefinition) {
                // todo: SSE MPC servers without a remote authority could be served from the renderer
                if (collection.remoteAuthority !== _extHostContext.remoteAuthority) {
                    return false;
                }
                if (serverDefinition.launch.type === 1 /* McpServerTransportType.Stdio */ && _extHostContext.extensionHostKind === 2 /* ExtensionHostKind.LocalWebWorker */) {
                    return false;
                }
                return true;
            },
            start: (collection, _serverDefiniton, resolveLaunch) => {
                const id = ++this._serverIdCounter;
                const launch = new ExtHostMcpServerLaunch(_extHostContext.extensionHostKind, () => proxy.$stopMcp(id), msg => proxy.$sendMessage(id, JSON.stringify(msg)));
                this._servers.set(id, launch);
                proxy.$startMcp(id, resolveLaunch);
                return launch;
            },
        }));
    }
    $upsertMcpCollection(collection, serversDto) {
        const servers = serversDto.map(McpServerDefinition.fromSerialized);
        const existing = this._collectionDefinitions.get(collection.id);
        if (existing) {
            existing.servers.set(servers, undefined);
        }
        else {
            const serverDefinitions = observableValue('mcpServers', servers);
            const store = new DisposableStore();
            const handle = store.add(new MutableDisposable());
            store.add(autorun(reader => {
                if (this._mcpEnabled.read(reader)) {
                    handle.value = this._mcpRegistry.registerCollection({
                        ...collection,
                        remoteAuthority: this._extHostContext.remoteAuthority,
                        serverDefinitions,
                    });
                }
                else {
                    handle.clear();
                }
            }));
            this._collectionDefinitions.set(collection.id, {
                fromExtHost: collection,
                servers: serverDefinitions,
                dispose: () => store.dispose(),
            });
        }
    }
    $deleteMcpCollection(collectionId) {
        this._collectionDefinitions.deleteAndDispose(collectionId);
    }
    $onDidChangeState(id, update) {
        const server = this._servers.get(id);
        if (!server) {
            return;
        }
        server.state.set(update, undefined);
        if (!McpConnectionState.isRunning(update)) {
            server.dispose();
            this._servers.delete(id);
        }
    }
    $onDidPublishLog(id, level, log) {
        if (typeof level === 'string') {
            level = LogLevel.Info;
            log = level;
        }
        this._servers.get(id)?.pushLog(level, log);
    }
    $onDidReceiveMessage(id, message) {
        this._servers.get(id)?.pushMessage(message);
    }
    dispose() {
        for (const server of this._servers.values()) {
            server.extHostDispose();
        }
        this._servers.clear();
        super.dispose();
    }
};
MainThreadMcp = __decorate([
    extHostNamedCustomer(MainContext.MainThreadMcp),
    __param(1, IMcpRegistry),
    __param(2, IConfigurationService)
], MainThreadMcp);
export { MainThreadMcp };
class ExtHostMcpServerLaunch extends Disposable {
    pushLog(level, message) {
        this._onDidLog.fire({ message, level });
    }
    pushMessage(message) {
        let parsed;
        try {
            parsed = JSON.parse(message);
        }
        catch (e) {
            this.pushLog(LogLevel.Warning, `Failed to parse message: ${JSON.stringify(message)}`);
        }
        if (parsed) {
            this._onDidReceiveMessage.fire(parsed);
        }
    }
    constructor(extHostKind, stop, send) {
        super();
        this.stop = stop;
        this.send = send;
        this.state = observableValue('mcpServerState', { state: 1 /* McpConnectionState.Kind.Starting */ });
        this._onDidLog = this._register(new Emitter());
        this.onDidLog = this._onDidLog.event;
        this._onDidReceiveMessage = this._register(new Emitter());
        this.onDidReceiveMessage = this._onDidReceiveMessage.event;
        this._register(disposableTimeout(() => {
            this.pushLog(LogLevel.Info, `Starting server from ${extensionHostKindToString(extHostKind)} extension host`);
        }));
    }
    extHostDispose() {
        if (McpConnectionState.isRunning(this.state.get())) {
            this.pushLog(LogLevel.Warning, 'Extension host shut down, server will stop.');
            this.state.set({ state: 0 /* McpConnectionState.Kind.Stopped */ }, undefined);
        }
        this.dispose();
    }
    dispose() {
        if (McpConnectionState.isRunning(this.state.get())) {
            this.stop();
        }
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE1jcC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZE1jcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDbEgsT0FBTyxFQUFFLE9BQU8sRUFBb0MsZUFBZSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2pGLE9BQU8sRUFBd0IsWUFBWSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbEcsT0FBTyxFQUEyQixrQkFBa0IsRUFBRSxtQkFBbUIsRUFBMEIsTUFBTSxzQ0FBc0MsQ0FBQztBQUVoSixPQUFPLEVBQXFCLHlCQUF5QixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDckgsT0FBTyxFQUFFLG9CQUFvQixFQUFtQixNQUFNLHNEQUFzRCxDQUFDO0FBQzdHLE9BQU8sRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFzQixNQUFNLCtCQUErQixDQUFDO0FBR3pGLElBQU0sYUFBYSxHQUFuQixNQUFNLGFBQWMsU0FB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