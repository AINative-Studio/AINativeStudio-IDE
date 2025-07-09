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
import { h } from '../../../../base/browser/dom.js';
import { assertNever } from '../../../../base/common/assert.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { groupBy } from '../../../../base/common/collections.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun, derived } from '../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../nls.js';
import { IActionViewItemService } from '../../../../platform/actions/browser/actionViewItemService.js';
import { MenuEntryActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, MenuId, MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { spinningLoading } from '../../../../platform/theme/common/iconRegistry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ActiveEditorContext, ResourceContextKey } from '../../../common/contextkeys.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { ChatMode } from '../../chat/common/constants.js';
import { TEXT_FILE_EDITOR_ID } from '../../files/common/files.js';
import { McpContextKeys } from '../common/mcpContextKeys.js';
import { IMcpRegistry } from '../common/mcpRegistryTypes.js';
import { IMcpService, McpConnectionState } from '../common/mcpTypes.js';
import { McpAddConfigurationCommand } from './mcpCommandsAddConfiguration.js';
import { McpUrlHandler } from './mcpUrlHandler.js';
// acroynms do not get localized
const category = {
    original: 'MCP',
    value: 'MCP',
};
export class ListMcpServerCommand extends Action2 {
    static { this.id = 'workbench.mcp.listServer'; }
    constructor() {
        super({
            id: ListMcpServerCommand.id,
            title: localize2('mcp.list', 'List Servers'),
            icon: Codicon.server,
            category,
            f1: true,
            menu: {
                when: ContextKeyExpr.and(ContextKeyExpr.or(McpContextKeys.hasUnknownTools, McpContextKeys.hasServersWithErrors), ChatContextKeys.chatMode.isEqualTo(ChatMode.Agent)),
                id: MenuId.ChatInputAttachmentToolbar,
                group: 'navigation',
                order: 0
            },
        });
    }
    async run(accessor) {
        const mcpService = accessor.get(IMcpService);
        const commandService = accessor.get(ICommandService);
        const quickInput = accessor.get(IQuickInputService);
        const store = new DisposableStore();
        const pick = quickInput.createQuickPick({ useSeparators: true });
        pick.placeholder = localize('mcp.selectServer', 'Select an MCP Server');
        store.add(pick);
        store.add(autorun(reader => {
            const servers = groupBy(mcpService.servers.read(reader).slice().sort((a, b) => (a.collection.presentation?.order || 0) - (b.collection.presentation?.order || 0)), s => s.collection.id);
            const firstRun = pick.items.length === 0;
            pick.items = [
                { id: '$add', label: localize('mcp.addServer', 'Add Server'), description: localize('mcp.addServer.description', 'Add a new server configuration'), alwaysShow: true, iconClass: ThemeIcon.asClassName(Codicon.add) },
                ...Object.values(servers).filter(s => s.length).flatMap((servers) => [
                    { type: 'separator', label: servers[0].collection.label, id: servers[0].collection.id },
                    ...servers.map(server => ({
                        id: server.definition.id,
                        label: server.definition.label,
                        description: McpConnectionState.toString(server.connectionState.read(reader)),
                    })),
                ]),
            ];
            if (firstRun && pick.items.length > 3) {
                pick.activeItems = pick.items.slice(2, 3); // select the first server by default
            }
        }));
        const picked = await new Promise(resolve => {
            store.add(pick.onDidAccept(() => {
                resolve(pick.activeItems[0]);
            }));
            store.add(pick.onDidHide(() => {
                resolve(undefined);
            }));
            pick.show();
        });
        store.dispose();
        if (!picked) {
            // no-op
        }
        else if (picked.id === '$add') {
            commandService.executeCommand(AddConfigurationAction.ID);
        }
        else {
            commandService.executeCommand(McpServerOptionsCommand.id, picked.id);
        }
    }
}
export class McpServerOptionsCommand extends Action2 {
    static { this.id = 'workbench.mcp.serverOptions'; }
    constructor() {
        super({
            id: McpServerOptionsCommand.id,
            title: localize2('mcp.options', 'Server Options'),
            category,
            f1: false,
        });
    }
    async run(accessor, id) {
        const mcpService = accessor.get(IMcpService);
        const quickInputService = accessor.get(IQuickInputService);
        const mcpRegistry = accessor.get(IMcpRegistry);
        const editorService = accessor.get(IEditorService);
        const server = mcpService.servers.get().find(s => s.definition.id === id);
        if (!server) {
            return;
        }
        const collection = mcpRegistry.collections.get().find(c => c.id === server.collection.id);
        const serverDefinition = collection?.serverDefinitions.get().find(s => s.id === server.definition.id);
        const items = [];
        const serverState = server.connectionState.get();
        // Only show start when server is stopped or in error state
        if (McpConnectionState.canBeStarted(serverState.state)) {
            items.push({
                label: localize('mcp.start', 'Start Server'),
                action: 'start'
            });
        }
        else {
            items.push({
                label: localize('mcp.stop', 'Stop Server'),
                action: 'stop'
            });
            items.push({
                label: localize('mcp.restart', 'Restart Server'),
                action: 'restart'
            });
        }
        items.push({
            label: localize('mcp.showOutput', 'Show Output'),
            action: 'showOutput'
        });
        const configTarget = serverDefinition?.presentation?.origin || collection?.presentation?.origin;
        if (configTarget) {
            items.push({
                label: localize('mcp.config', 'Show Configuration'),
                action: 'config',
            });
        }
        const pick = await quickInputService.pick(items, {
            title: server.definition.label,
            placeHolder: localize('mcp.selectAction', 'Select Server Action')
        });
        if (!pick) {
            return;
        }
        switch (pick.action) {
            case 'start':
                await server.start(true);
                server.showOutput();
                break;
            case 'stop':
                await server.stop();
                break;
            case 'restart':
                await server.stop();
                await server.start(true);
                break;
            case 'showOutput':
                server.showOutput();
                break;
            case 'config':
                editorService.openEditor({
                    resource: URI.isUri(configTarget) ? configTarget : configTarget.uri,
                    options: { selection: URI.isUri(configTarget) ? undefined : configTarget.range }
                });
                break;
            default:
                assertNever(pick.action);
        }
    }
}
let MCPServerActionRendering = class MCPServerActionRendering extends Disposable {
    static { this.ID = 'workbench.contrib.mcp.discovery'; }
    constructor(actionViewItemService, mcpService, instaService, commandService) {
        super();
        let DisplayedState;
        (function (DisplayedState) {
            DisplayedState[DisplayedState["None"] = 0] = "None";
            DisplayedState[DisplayedState["NewTools"] = 1] = "NewTools";
            DisplayedState[DisplayedState["Error"] = 2] = "Error";
            DisplayedState[DisplayedState["Refreshing"] = 3] = "Refreshing";
        })(DisplayedState || (DisplayedState = {}));
        const displayedState = derived((reader) => {
            const servers = mcpService.servers.read(reader);
            const serversPerState = [];
            for (const server of servers) {
                let thisState = 0 /* DisplayedState.None */;
                switch (server.toolsState.read(reader)) {
                    case 0 /* McpServerToolsState.Unknown */:
                        if (server.trusted.read(reader) === false) {
                            thisState = 0 /* DisplayedState.None */;
                        }
                        else {
                            thisState = server.connectionState.read(reader).state === 3 /* McpConnectionState.Kind.Error */ ? 2 /* DisplayedState.Error */ : 1 /* DisplayedState.NewTools */;
                        }
                        break;
                    case 2 /* McpServerToolsState.RefreshingFromUnknown */:
                        thisState = 3 /* DisplayedState.Refreshing */;
                        break;
                    default:
                        thisState = server.connectionState.read(reader).state === 3 /* McpConnectionState.Kind.Error */ ? 2 /* DisplayedState.Error */ : 0 /* DisplayedState.None */;
                        break;
                }
                serversPerState[thisState] ??= [];
                serversPerState[thisState].push(server);
            }
            const unknownServerStates = mcpService.lazyCollectionState.read(reader);
            if (unknownServerStates === 1 /* LazyCollectionState.LoadingUnknown */) {
                serversPerState[3 /* DisplayedState.Refreshing */] ??= [];
            }
            else if (unknownServerStates === 0 /* LazyCollectionState.HasUnknown */) {
                serversPerState[1 /* DisplayedState.NewTools */] ??= [];
            }
            const maxState = (serversPerState.length - 1);
            return { state: maxState, servers: serversPerState[maxState] || [] };
        });
        this._store.add(actionViewItemService.register(MenuId.ChatInputAttachmentToolbar, ListMcpServerCommand.id, (action, options) => {
            if (!(action instanceof MenuItemAction)) {
                return undefined;
            }
            return instaService.createInstance(class extends MenuEntryActionViewItem {
                render(container) {
                    super.render(container);
                    container.classList.add('chat-mcp');
                    const action = h('button.chat-mcp-action', [h('span@icon')]);
                    this._register(autorun(r => {
                        const { state } = displayedState.read(r);
                        const { root, icon } = action;
                        this.updateTooltip();
                        container.classList.toggle('chat-mcp-has-action', state !== 0 /* DisplayedState.None */);
                        if (!root.parentElement) {
                            container.appendChild(root);
                        }
                        root.ariaLabel = this.getLabelForState(displayedState.read(r));
                        root.className = 'chat-mcp-action';
                        icon.className = '';
                        if (state === 1 /* DisplayedState.NewTools */) {
                            root.classList.add('chat-mcp-action-new');
                            icon.classList.add(...ThemeIcon.asClassNameArray(Codicon.refresh));
                        }
                        else if (state === 2 /* DisplayedState.Error */) {
                            root.classList.add('chat-mcp-action-error');
                            icon.classList.add(...ThemeIcon.asClassNameArray(Codicon.warning));
                        }
                        else if (state === 3 /* DisplayedState.Refreshing */) {
                            root.classList.add('chat-mcp-action-refreshing');
                            icon.classList.add(...ThemeIcon.asClassNameArray(spinningLoading));
                        }
                        else {
                            root.remove();
                        }
                    }));
                }
                async onClick(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const { state, servers } = displayedState.get();
                    if (state === 1 /* DisplayedState.NewTools */) {
                        servers.forEach(server => server.start());
                        mcpService.activateCollections();
                    }
                    else if (state === 3 /* DisplayedState.Refreshing */) {
                        servers.at(-1)?.showOutput();
                    }
                    else if (state === 2 /* DisplayedState.Error */) {
                        const server = servers.at(-1);
                        if (server) {
                            commandService.executeCommand(McpServerOptionsCommand.id, server.definition.id);
                        }
                    }
                    else {
                        commandService.executeCommand(ListMcpServerCommand.id);
                    }
                }
                getTooltip() {
                    return this.getLabelForState() || super.getTooltip();
                }
                getLabelForState({ state, servers } = displayedState.get()) {
                    if (state === 1 /* DisplayedState.NewTools */) {
                        return localize('mcp.newTools', "New tools available ({0})", servers.length || 1);
                    }
                    else if (state === 2 /* DisplayedState.Error */) {
                        return localize('mcp.toolError', "Error loading {0} tool(s)", servers.length || 1);
                    }
                    else if (state === 3 /* DisplayedState.Refreshing */) {
                        return localize('mcp.toolRefresh', "Discovering tools...");
                    }
                    else {
                        return null;
                    }
                }
            }, action, { ...options, keybindingNotRenderedWithLabel: true });
        }, Event.fromObservable(displayedState)));
    }
};
MCPServerActionRendering = __decorate([
    __param(0, IActionViewItemService),
    __param(1, IMcpService),
    __param(2, IInstantiationService),
    __param(3, ICommandService)
], MCPServerActionRendering);
export { MCPServerActionRendering };
export class ResetMcpTrustCommand extends Action2 {
    static { this.ID = 'workbench.mcp.resetTrust'; }
    constructor() {
        super({
            id: ResetMcpTrustCommand.ID,
            title: localize2('mcp.resetTrust', "Reset Trust"),
            category,
            f1: true,
            precondition: McpContextKeys.toolsCount.greater(0),
        });
    }
    run(accessor) {
        const mcpService = accessor.get(IMcpRegistry);
        mcpService.resetTrust();
    }
}
export class ResetMcpCachedTools extends Action2 {
    static { this.ID = 'workbench.mcp.resetCachedTools'; }
    constructor() {
        super({
            id: ResetMcpCachedTools.ID,
            title: localize2('mcp.resetCachedTools', "Reset Cached Tools"),
            category,
            f1: true,
            precondition: McpContextKeys.toolsCount.greater(0),
        });
    }
    run(accessor) {
        const mcpService = accessor.get(IMcpService);
        mcpService.resetCaches();
    }
}
export class AddConfigurationAction extends Action2 {
    static { this.ID = 'workbench.mcp.addConfiguration'; }
    constructor() {
        super({
            id: AddConfigurationAction.ID,
            title: localize2('mcp.addConfiguration', "Add Server..."),
            metadata: {
                description: localize2('mcp.addConfiguration.description', "Installs a new Model Context protocol to the mcp.json settings"),
            },
            category,
            f1: true,
            menu: {
                id: MenuId.EditorContent,
                when: ContextKeyExpr.and(ContextKeyExpr.regex(ResourceContextKey.Path.key, /\.vscode[/\\]mcp\.json$/), ActiveEditorContext.isEqualTo(TEXT_FILE_EDITOR_ID))
            }
        });
    }
    async run(accessor, configUri) {
        return accessor.get(IInstantiationService).createInstance(McpAddConfigurationCommand, configUri).run();
    }
}
export class RemoveStoredInput extends Action2 {
    static { this.ID = 'workbench.mcp.removeStoredInput'; }
    constructor() {
        super({
            id: RemoveStoredInput.ID,
            title: localize2('mcp.resetCachedTools', "Reset Cached Tools"),
            category,
            f1: false,
        });
    }
    run(accessor, scope, id) {
        accessor.get(IMcpRegistry).clearSavedInputs(scope, id);
    }
}
export class EditStoredInput extends Action2 {
    static { this.ID = 'workbench.mcp.editStoredInput'; }
    constructor() {
        super({
            id: EditStoredInput.ID,
            title: localize2('mcp.editStoredInput', "Edit Stored Input"),
            category,
            f1: false,
        });
    }
    run(accessor, inputId, uri, configSection, target) {
        const workspaceFolder = uri && accessor.get(IWorkspaceContextService).getWorkspaceFolder(uri);
        accessor.get(IMcpRegistry).editSavedInput(inputId, workspaceFolder || undefined, configSection, target);
    }
}
export class ShowOutput extends Action2 {
    static { this.ID = 'workbench.mcp.showOutput'; }
    constructor() {
        super({
            id: ShowOutput.ID,
            title: localize2('mcp.command.showOutput', "Show Output"),
            category,
            f1: false,
        });
    }
    run(accessor, serverId) {
        accessor.get(IMcpService).servers.get().find(s => s.definition.id === serverId)?.showOutput();
    }
}
export class RestartServer extends Action2 {
    static { this.ID = 'workbench.mcp.restartServer'; }
    constructor() {
        super({
            id: RestartServer.ID,
            title: localize2('mcp.command.restartServer', "Restart Server"),
            category,
            f1: false,
        });
    }
    async run(accessor, serverId) {
        const s = accessor.get(IMcpService).servers.get().find(s => s.definition.id === serverId);
        s?.showOutput();
        await s?.stop();
        await s?.start();
    }
}
export class StartServer extends Action2 {
    static { this.ID = 'workbench.mcp.startServer'; }
    constructor() {
        super({
            id: StartServer.ID,
            title: localize2('mcp.command.startServer', "Start Server"),
            category,
            f1: false,
        });
    }
    async run(accessor, serverId) {
        const s = accessor.get(IMcpService).servers.get().find(s => s.definition.id === serverId);
        await s?.start();
    }
}
export class StopServer extends Action2 {
    static { this.ID = 'workbench.mcp.stopServer'; }
    constructor() {
        super({
            id: StopServer.ID,
            title: localize2('mcp.command.stopServer', "Stop Server"),
            category,
            f1: false,
        });
    }
    async run(accessor, serverId) {
        const s = accessor.get(IMcpService).servers.get().find(s => s.definition.id === serverId);
        await s?.stop();
    }
}
export class InstallFromActivation extends Action2 {
    static { this.ID = 'workbench.mcp.installFromActivation'; }
    constructor() {
        super({
            id: InstallFromActivation.ID,
            title: localize2('mcp.command.installFromActivation', "Install..."),
            category,
            f1: false,
            menu: {
                id: MenuId.EditorContent,
                when: ContextKeyExpr.equals('resourceScheme', McpUrlHandler.scheme)
            }
        });
    }
    async run(accessor, uri) {
        const addConfigHelper = accessor.get(IInstantiationService).createInstance(McpAddConfigurationCommand, undefined);
        addConfigHelper.pickForUrlHandler(uri);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2Jyb3dzZXIvbWNwQ29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3BELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDekUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQW9CLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMzRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUMxRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFbkYsT0FBTyxFQUFFLGNB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