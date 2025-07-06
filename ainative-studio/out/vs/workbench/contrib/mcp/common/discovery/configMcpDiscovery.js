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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnTWNwRGlzY292ZXJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9kaXNjb3ZlcnkvY29uZmlnTWNwRGlzY292ZXJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLElBQUksV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDN0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEgsT0FBTyxFQUFFLFlBQVksRUFBdUIsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDOUcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXhELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQy9ELE9BQU8sRUFBa0Isc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNyRixPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDcEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3RELE9BQU8sRUFBRSxtQkFBbUIsRUFBMEIsTUFBTSxnQkFBZ0IsQ0FBQztBQVU3RTs7R0FFRztBQUNJLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEsVUFBVTtJQUdqRCxZQUN3QixxQkFBNkQsRUFD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