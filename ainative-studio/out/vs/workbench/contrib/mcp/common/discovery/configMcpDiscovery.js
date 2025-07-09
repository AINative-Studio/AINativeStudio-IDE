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
import { equals as arrayEquals } from '../../../../../base/common/arrays.js';
import { Throttler } from '../../../../../base/common/async.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { autorunDelta, observableValue } from '../../../../../base/common/observable.js';
import { URI } from '../../../../../base/common/uri.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { getMcpServerMapping } from '../mcpConfigFileUtils.js';
import { IMcpConfigPathsService } from '../mcpConfigPathsService.js';
import { mcpConfigurationSection } from '../mcpConfiguration.js';
import { IMcpRegistry } from '../mcpRegistryTypes.js';
import { McpServerDefinition } from '../mcpTypes.js';
/**
 * Discovers MCP servers based on various config sources.
 */
let ConfigMcpDiscovery = class ConfigMcpDiscovery extends Disposable {
    constructor(_configurationService, _mcpRegistry, _textModelService, _mcpConfigPathsService) {
        super();
        this._configurationService = _configurationService;
        this._mcpRegistry = _mcpRegistry;
        this._textModelService = _textModelService;
        this._mcpConfigPathsService = _mcpConfigPathsService;
        this.configSources = [];
    }
    start() {
        const throttler = this._register(new Throttler());
        const addPath = (path) => {
            this.configSources.push({
                path,
                serverDefinitions: observableValue(this, []),
                disposable: this._register(new MutableDisposable()),
                getServerToLocationMapping: (uri) => this._getServerIdMapping(uri, path.section ? [...path.section, 'servers'] : ['servers']),
            });
        };
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(mcpConfigurationSection)) {
                throttler.queue(() => this.sync());
            }
        }));
        this._register(autorunDelta(this._mcpConfigPathsService.paths, ({ lastValue, newValue }) => {
            for (const last of lastValue || []) {
                if (!newValue.includes(last)) {
                    const idx = this.configSources.findIndex(src => src.path.id === last.id);
                    if (idx !== -1) {
                        this.configSources[idx].disposable.dispose();
                        this.configSources.splice(idx, 1);
                    }
                }
            }
            for (const next of newValue) {
                if (!lastValue || !lastValue.includes(next)) {
                    addPath(next);
                }
            }
            this.sync();
        }));
    }
    async _getServerIdMapping(resource, pathToServers) {
        const store = new DisposableStore();
        try {
            const ref = await this._textModelService.createModelReference(resource);
            store.add(ref);
            const serverIdMapping = getMcpServerMapping({ model: ref.object.textEditorModel, pathToServers });
            return serverIdMapping;
        }
        catch {
            return new Map();
        }
        finally {
            store.dispose();
        }
    }
    async sync() {
        const configurationKey = this._configurationService.inspect(mcpConfigurationSection);
        const configMappings = await Promise.all(this.configSources.map(src => {
            const uri = src.path.uri;
            return uri && src.getServerToLocationMapping(uri);
        }));
        for (const [index, src] of this.configSources.entries()) {
            const collectionId = `mcp.config.${src.path.id}`;
            // inspect() will give the first workspace folder, and must be
            // asked for explicitly for other folders.
            let value = src.path.workspaceFolder
                ? this._configurationService.inspect(mcpConfigurationSection, { resource: src.path.workspaceFolder.uri })[src.path.key]
                : configurationKey[src.path.key];
            // If we see there are MCP servers, migrate them automatically
            if (value?.mcpServers) {
                value = { ...value, servers: { ...value.servers, ...value.mcpServers }, mcpServers: undefined };
                this._configurationService.updateValue(mcpConfigurationSection, value, {}, src.path.target, { donotNotifyError: true });
            }
            const configMapping = configMappings[index];
            const nextDefinitions = Object.entries(value?.servers || {}).map(([name, value]) => ({
                id: `${collectionId}.${name}`,
                label: name,
                launch: 'type' in value && value.type === 'sse' ? {
                    type: 2 /* McpServerTransportType.SSE */,
                    uri: URI.parse(value.url),
                    headers: Object.entries(value.headers || {}),
                } : {
                    type: 1 /* McpServerTransportType.Stdio */,
                    args: value.args || [],
                    command: value.command,
                    env: value.env || {},
                    envFile: value.envFile,
                    cwd: undefined,
                },
                roots: src.path.workspaceFolder ? [src.path.workspaceFolder.uri] : [],
                variableReplacement: {
                    folder: src.path.workspaceFolder,
                    section: mcpConfigurationSection,
                    target: src.path.target,
                },
                presentation: {
                    order: src.path.order,
                    origin: configMapping?.get(name),
                }
            }));
            if (arrayEquals(nextDefinitions, src.serverDefinitions.get(), McpServerDefinition.equals)) {
                continue;
            }
            if (!nextDefinitions.length) {
                src.disposable.clear();
                src.serverDefinitions.set(nextDefinitions, undefined);
            }
            else {
                src.serverDefinitions.set(nextDefinitions, undefined);
                src.disposable.value ??= this._mcpRegistry.registerCollection({
                    id: collectionId,
                    label: src.path.label,
                    presentation: { order: src.path.order, origin: src.path.uri },
                    remoteAuthority: src.path.remoteAuthority || null,
                    serverDefinitions: src.serverDefinitions,
                    isTrustedByDefault: true,
                    scope: src.path.scope,
                });
            }
        }
    }
};
ConfigMcpDiscovery = __decorate([
    __param(0, IConfigurationService),
    __param(1, IMcpRegistry),
    __param(2, ITextModelService),
    __param(3, IMcpConfigPathsService)
], ConfigMcpDiscovery);
export { ConfigMcpDiscovery };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnTWNwRGlzY292ZXJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vZGlzY292ZXJ5L2NvbmZpZ01jcERpc2NvdmVyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsTUFBTSxJQUFJLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3RILE9BQU8sRUFBRSxZQUFZLEVBQXVCLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzlHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV4RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM3RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMvRCxPQUFPLEVBQWtCLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDckYsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3BGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsbUJBQW1CLEVBQTBCLE1BQU0sZ0JBQWdCLENBQUM7QUFVN0U7O0dBRUc7QUFDSSxJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFtQixTQUFRLFVBQVU7SUFHakQsWUFDd0IscUJBQTZELEVB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