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
import { computeLevenshteinDistance } from '../../../../base/common/diff/diff.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { markdownCommandLink, MarkdownString } from '../../../../base/common/htmlContent.js';
import { findNodeAtLocation, parseTree } from '../../../../base/common/json.js';
import { Disposable, DisposableStore, dispose, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { isEqual } from '../../../../base/common/resources.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { localize } from '../../../../nls.js';
import { IMarkerService, MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { ConfigurationResolverExpression } from '../../../services/configurationResolver/common/configurationResolverExpression.js';
import { IMcpConfigPathsService } from '../common/mcpConfigPathsService.js';
import { mcpConfigurationSection } from '../common/mcpConfiguration.js';
import { IMcpRegistry } from '../common/mcpRegistryTypes.js';
import { IMcpService } from '../common/mcpTypes.js';
import { EditStoredInput, RemoveStoredInput, RestartServer, ShowOutput, StartServer, StopServer } from './mcpCommands.js';
const diagnosticOwner = 'vscode.mcp';
let McpLanguageFeatures = class McpLanguageFeatures extends Disposable {
    constructor(languageFeaturesService, _mcpRegistry, _mcpConfigPathsService, _mcpService, _markerService, _configurationResolverService) {
        super();
        this._mcpRegistry = _mcpRegistry;
        this._mcpConfigPathsService = _mcpConfigPathsService;
        this._mcpService = _mcpService;
        this._markerService = _markerService;
        this._configurationResolverService = _configurationResolverService;
        this._cachedMcpSection = this._register(new MutableDisposable());
        const patterns = [
            { pattern: '**/.vscode/mcp.json' },
            { pattern: '**/settings.json' },
            { pattern: '**/workspace.json' },
        ];
        const onDidChangeCodeLens = this._register(new Emitter());
        const codeLensProvider = {
            onDidChange: onDidChangeCodeLens.event,
            provideCodeLenses: (model, range) => this._provideCodeLenses(model, () => onDidChangeCodeLens.fire(codeLensProvider)),
        };
        this._register(languageFeaturesService.codeLensProvider.register(patterns, codeLensProvider));
        this._register(languageFeaturesService.inlayHintsProvider.register(patterns, {
            onDidChangeInlayHints: _mcpRegistry.onDidChangeInputs,
            provideInlayHints: (model, range) => this._provideInlayHints(model, range),
        }));
    }
    /** Simple mechanism to avoid extra json parsing for hints+lenses */
    _parseModel(model) {
        if (this._cachedMcpSection.value?.model === model) {
            return this._cachedMcpSection.value;
        }
        const uri = model.uri;
        const inConfig = this._mcpConfigPathsService.paths.get().find(u => isEqual(u.uri, uri));
        if (!inConfig) {
            return undefined;
        }
        const value = model.getValue();
        const tree = parseTree(value);
        const listeners = [
            model.onDidChangeContent(() => this._cachedMcpSection.clear()),
            model.onWillDispose(() => this._cachedMcpSection.clear()),
        ];
        this._addDiagnostics(model, value, tree, inConfig);
        return this._cachedMcpSection.value = {
            model,
            tree,
            inConfig,
            dispose: () => {
                this._markerService.remove(diagnosticOwner, [uri]);
                dispose(listeners);
            }
        };
    }
    _addDiagnostics(tm, value, tree, inConfig) {
        const serversNode = findNodeAtLocation(tree, inConfig.section ? [...inConfig.section, 'servers'] : ['servers']);
        if (!serversNode) {
            return;
        }
        const getClosestMatchingVariable = (name) => {
            let bestValue = '';
            let bestDistance = Infinity;
            for (const variable of this._configurationResolverService.resolvableVariables) {
                const distance = computeLevenshteinDistance(name, variable);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestValue = variable;
                }
            }
            return bestValue;
        };
        const diagnostics = [];
        forEachPropertyWithReplacement(serversNode, node => {
            const expr = ConfigurationResolverExpression.parse(node.value);
            for (const { id, name, arg } of expr.unresolved()) {
                if (!this._configurationResolverService.resolvableVariables.has(name)) {
                    const position = value.indexOf(id, node.offset);
                    if (position === -1) {
                        continue;
                    } // unreachable?
                    const start = tm.getPositionAt(position);
                    const end = tm.getPositionAt(position + id.length);
                    diagnostics.push({
                        severity: MarkerSeverity.Warning,
                        message: localize('mcp.variableNotFound', 'Variable `{0}` not found, did you mean ${{1}}?', name, getClosestMatchingVariable(name) + (arg ? `:${arg}` : '')),
                        startLineNumber: start.lineNumber,
                        startColumn: start.column,
                        endLineNumber: end.lineNumber,
                        endColumn: end.column,
                        modelVersionId: tm.getVersionId(),
                    });
                }
            }
        });
        if (diagnostics.length) {
            this._markerService.changeOne(diagnosticOwner, tm.uri, diagnostics);
        }
        else {
            this._markerService.remove(diagnosticOwner, [tm.uri]);
        }
    }
    _provideCodeLenses(model, onDidChangeCodeLens) {
        const parsed = this._parseModel(model);
        if (!parsed) {
            return undefined;
        }
        const { tree, inConfig } = parsed;
        const serversNode = findNodeAtLocation(tree, inConfig.section ? [...inConfig.section, 'servers'] : ['servers']);
        if (!serversNode) {
            return undefined;
        }
        const store = new DisposableStore();
        const lenses = { lenses: [], dispose: () => store.dispose() };
        const read = (observable) => {
            store.add(Event.fromObservableLight(observable)(onDidChangeCodeLens));
            return observable.get();
        };
        const collection = read(this._mcpRegistry.collections).find(c => isEqual(c.presentation?.origin, model.uri));
        if (!collection) {
            return lenses;
        }
        const mcpServers = read(this._mcpService.servers).filter(s => s.collection.id === collection.id);
        for (const node of serversNode.children || []) {
            if (node.type !== 'property' || node.children?.[0]?.type !== 'string') {
                continue;
            }
            const name = node.children[0].value;
            const server = mcpServers.find(s => s.definition.label === name);
            if (!server) {
                continue;
            }
            const range = Range.fromPositions(model.getPositionAt(node.children[0].offset));
            switch (read(server.connectionState).state) {
                case 3 /* McpConnectionState.Kind.Error */:
                    lenses.lenses.push({
                        range,
                        command: {
                            id: ShowOutput.ID,
                            title: '$(error) ' + localize('server.error', 'Error'),
                            arguments: [server.definition.id],
                        },
                    }, {
                        range,
                        command: {
                            id: RestartServer.ID,
                            title: localize('mcp.restart', "Restart"),
                            arguments: [server.definition.id],
                        },
                    });
                    break;
                case 1 /* McpConnectionState.Kind.Starting */:
                    lenses.lenses.push({
                        range,
                        command: {
                            id: ShowOutput.ID,
                            title: '$(loading~spin) ' + localize('server.starting', 'Starting'),
                            arguments: [server.definition.id],
                        },
                    }, {
                        range,
                        command: {
                            id: StopServer.ID,
                            title: localize('cancel', "Cancel"),
                            arguments: [server.definition.id],
                        },
                    });
                    break;
                case 2 /* McpConnectionState.Kind.Running */:
                    lenses.lenses.push({
                        range,
                        command: {
                            id: ShowOutput.ID,
                            title: '$(check) ' + localize('server.running', 'Running'),
                            arguments: [server.definition.id],
                        },
                    }, {
                        range,
                        command: {
                            id: StopServer.ID,
                            title: localize('mcp.stop', "Stop"),
                            arguments: [server.definition.id],
                        },
                    }, {
                        range,
                        command: {
                            id: RestartServer.ID,
                            title: localize('mcp.restart', "Restart"),
                            arguments: [server.definition.id],
                        },
                    }, {
                        range,
                        command: {
                            id: '',
                            title: localize('server.toolCount', '{0} tools', read(server.tools).length),
                        },
                    });
                    break;
                case 0 /* McpConnectionState.Kind.Stopped */: {
                    lenses.lenses.push({
                        range,
                        command: {
                            id: StartServer.ID,
                            title: '$(debug-start) ' + localize('mcp.start', "Start"),
                            arguments: [server.definition.id],
                        },
                    });
                    const toolCount = read(server.tools).length;
                    if (toolCount) {
                        lenses.lenses.push({
                            range,
                            command: {
                                id: '',
                                title: localize('server.toolCountCached', '{0} cached tools', toolCount),
                            }
                        });
                    }
                }
            }
        }
        return lenses;
    }
    async _provideInlayHints(model, range) {
        const parsed = this._parseModel(model);
        if (!parsed) {
            return undefined;
        }
        const { tree, inConfig } = parsed;
        const mcpSection = inConfig.section ? findNodeAtLocation(tree, [...inConfig.section]) : tree;
        if (!mcpSection) {
            return undefined;
        }
        const inputsNode = findNodeAtLocation(mcpSection, ['inputs']);
        if (!inputsNode) {
            return undefined;
        }
        const inputs = await this._mcpRegistry.getSavedInputs(inConfig.scope);
        const hints = [];
        const serversNode = findNodeAtLocation(mcpSection, ['servers']);
        if (serversNode) {
            annotateServers(serversNode);
        }
        annotateInputs(inputsNode);
        return { hints, dispose: () => { } };
        function annotateServers(servers) {
            forEachPropertyWithReplacement(servers, node => {
                const expr = ConfigurationResolverExpression.parse(node.value);
                for (const { id } of expr.unresolved()) {
                    const saved = inputs[id];
                    if (saved) {
                        pushAnnotation(id, node.offset + node.value.indexOf(id) + id.length, saved);
                    }
                }
            });
        }
        function annotateInputs(node) {
            if (node.type !== 'array' || !node.children) {
                return;
            }
            for (const input of node.children) {
                if (input.type !== 'object' || !input.children) {
                    continue;
                }
                const idProp = input.children.find(c => c.type === 'property' && c.children?.[0].value === 'id');
                if (!idProp) {
                    continue;
                }
                const id = idProp.children[1];
                if (!id || id.type !== 'string' || !id.value) {
                    continue;
                }
                const savedId = '${input:' + id.value + '}';
                const saved = inputs[savedId];
                if (saved) {
                    pushAnnotation(savedId, id.offset + 1 + id.length, saved);
                }
            }
        }
        function pushAnnotation(savedId, offset, saved) {
            const tooltip = new MarkdownString([
                markdownCommandLink({ id: EditStoredInput.ID, title: localize('edit', 'Edit'), arguments: [savedId, model.uri, mcpConfigurationSection, inConfig.target] }),
                markdownCommandLink({ id: RemoveStoredInput.ID, title: localize('clear', 'Clear'), arguments: [inConfig.scope, savedId] }),
                markdownCommandLink({ id: RemoveStoredInput.ID, title: localize('clearAll', 'Clear All'), arguments: [inConfig.scope] }),
            ].join(' | '), { isTrusted: true });
            const hint = {
                label: '= ' + (saved.input?.type === 'promptString' && saved.input.password ? '*'.repeat(10) : (saved.value || '')),
                position: model.getPositionAt(offset),
                tooltip,
                paddingLeft: true,
            };
            hints.push(hint);
            return hint;
        }
    }
};
McpLanguageFeatures = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, IMcpRegistry),
    __param(2, IMcpConfigPathsService),
    __param(3, IMcpService),
    __param(4, IMarkerService),
    __param(5, IConfigurationResolverService)
], McpLanguageFeatures);
export { McpLanguageFeatures };
function forEachPropertyWithReplacement(node, callback) {
    if (node.type === 'string' && typeof node.value === 'string' && node.value.includes(ConfigurationResolverExpression.VARIABLE_LHS)) {
        callback(node);
    }
    else if (node.type === 'property') {
        // skip the property name
        node.children?.slice(1).forEach(n => forEachPropertyWithReplacement(n, callback));
    }
    else {
        node.children?.forEach(n => forEachPropertyWithReplacement(n, callback));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwTGFuZ3VhZ2VGZWF0dXJlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvYnJvd3Nlci9tY3BMYW5ndWFnZUZlYXR1cmVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxrQkFBa0IsRUFBUSxTQUFTLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN0RixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUU1SCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDL0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBR2hFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQWUsY0FBYyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRTdHLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBQ3hILE9BQU8sRUFBRSwrQkFBK0IsRUFBa0IsTUFBTSxtRkFBbUYsQ0FBQztBQUNwSixPQUFPLEVBQWtCLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUYsT0FBTyxF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