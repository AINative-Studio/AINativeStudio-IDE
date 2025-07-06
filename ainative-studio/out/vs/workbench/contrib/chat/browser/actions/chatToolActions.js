/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../../../base/common/assert.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { diffSets } from '../../../../../base/common/collections.js';
import { Event } from '../../../../../base/common/event.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { IExtensionsWorkbenchService } from '../../../extensions/common/extensions.js';
import { AddConfigurationAction } from '../../../mcp/browser/mcpCommands.js';
import { IMcpService, McpConnectionState } from '../../../mcp/common/mcpTypes.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { isResponseVM } from '../../common/chatViewModel.js';
import { ChatMode } from '../../common/constants.js';
import { ILanguageModelToolsService } from '../../common/languageModelToolsService.js';
import { IChatWidgetService } from '../chat.js';
import { CHAT_CATEGORY } from './chatActions.js';
export const AcceptToolConfirmationActionId = 'workbench.action.chat.acceptTool';
class AcceptToolConfirmation extends Action2 {
    constructor() {
        super({
            id: AcceptToolConfirmationActionId,
            title: localize2('chat.accept', "Accept"),
            f1: false,
            category: CHAT_CATEGORY,
            keybinding: {
                when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.Editing.hasToolConfirmation),
                primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                // Override chatEditor.action.accept
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
            },
        });
    }
    run(accessor, ...args) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const widget = chatWidgetService.lastFocusedWidget;
        const lastItem = widget?.viewModel?.getItems().at(-1);
        if (!isResponseVM(lastItem)) {
            return;
        }
        const unconfirmedToolInvocation = lastItem.model.response.value.find((item) => item.kind === 'toolInvocation' && !item.isConfirmed);
        if (unconfirmedToolInvocation) {
            unconfirmedToolInvocation.confirmed.complete(true);
        }
        // Return focus to the chat input, in case it was in the tool confirmation editor
        widget?.focusInput();
    }
}
export class AttachToolsAction extends Action2 {
    static { this.id = 'workbench.action.chat.attachTools'; }
    constructor() {
        super({
            id: AttachToolsAction.id,
            title: localize('label', "Select Tools..."),
            icon: Codicon.tools,
            f1: false,
            category: CHAT_CATEGORY,
            precondition: ChatContextKeys.chatMode.isEqualTo(ChatMode.Agent),
            menu: {
                when: ChatContextKeys.chatMode.isEqualTo(ChatMode.Agent),
                id: MenuId.ChatInputAttachmentToolbar,
                group: 'navigation',
                order: 1
            },
            keybinding: {
                when: ContextKeyExpr.and(ChatContextKeys.inChatInput, ChatContextKeys.chatMode.isEqualTo(ChatMode.Agent)),
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 90 /* KeyCode.Slash */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    async run(accessor, ...args) {
        const quickPickService = accessor.get(IQuickInputService);
        const mcpService = accessor.get(IMcpService);
        const toolsService = accessor.get(ILanguageModelToolsService);
        const extensionService = accessor.get(IExtensionService);
        const chatWidgetService = accessor.get(IChatWidgetService);
        const telemetryService = accessor.get(ITelemetryService);
        const commandService = accessor.get(ICommandService);
        const extensionWorkbenchService = accessor.get(IExtensionsWorkbenchService);
        let widget = chatWidgetService.lastFocusedWidget;
        if (!widget) {
            function isChatActionContext(obj) {
                return obj && typeof obj === 'object' && obj.widget;
            }
            const context = args[0];
            if (isChatActionContext(context)) {
                widget = context.widget;
            }
        }
        if (!widget) {
            return;
        }
        const mcpServerByTool = new Map();
        for (const server of mcpService.servers.get()) {
            for (const tool of server.tools.get()) {
                mcpServerByTool.set(tool.id, server);
            }
        }
        let BucketOrdinal;
        (function (BucketOrdinal) {
            BucketOrdinal[BucketOrdinal["Extension"] = 0] = "Extension";
            BucketOrdinal[BucketOrdinal["Mcp"] = 1] = "Mcp";
            BucketOrdinal[BucketOrdinal["Other"] = 2] = "Other";
        })(BucketOrdinal || (BucketOrdinal = {}));
        const addMcpPick = { type: 'item', label: localize('addServer', "Add MCP Server..."), iconClass: ThemeIcon.asClassName(Codicon.add), pickable: false, run: () => commandService.executeCommand(AddConfigurationAction.ID) };
        const addExpPick = { type: 'item', label: localize('addExtension', "Install Extension..."), iconClass: ThemeIcon.asClassName(Codicon.add), pickable: false, run: () => extensionWorkbenchService.openSearch('@tag:language-model-tools') };
        const addPick = {
            type: 'item', label: localize('addAny', "Add More Tools..."), iconClass: ThemeIcon.asClassName(Codicon.add), pickable: false, run: async () => {
                const pick = await quickPickService.pick([addMcpPick, addExpPick], {
                    canPickMany: false,
                    title: localize('noTools', "Add tools to chat")
                });
                pick?.run();
            }
        };
        const defaultBucket = {
            type: 'item',
            children: [],
            label: localize('defaultBucketLabel', "Other Tools"),
            source: { type: 'internal' },
            ordinal: 2 /* BucketOrdinal.Other */,
            picked: true,
        };
        const nowSelectedTools = new Set(widget.input.selectedToolsModel.tools.get());
        const toolBuckets = new Map();
        for (const tool of toolsService.getTools()) {
            if (!tool.supportsToolPicker) {
                continue;
            }
            let bucket;
            if (tool.source.type === 'mcp') {
                const mcpServer = mcpServerByTool.get(tool.id);
                if (!mcpServer) {
                    continue;
                }
                bucket = toolBuckets.get(mcpServer.definition.id) ?? {
                    type: 'item',
                    label: localize('mcplabel', "MCP Server: {0}", mcpServer?.definition.label),
                    status: localize('mcpstatus', "From {0} ({1})", mcpServer.collection.label, McpConnectionState.toString(mcpServer.connectionState.get())),
                    ordinal: 1 /* BucketOrdinal.Mcp */,
                    source: tool.source,
                    picked: false,
                    children: []
                };
                toolBuckets.set(mcpServer.definition.id, bucket);
            }
            else if (tool.source.type === 'extension') {
                const extensionId = tool.source.extensionId;
                const ext = extensionService.extensions.find(value => ExtensionIdentifier.equals(value.identifier, extensionId));
                if (!ext) {
                    continue;
                }
                bucket = toolBuckets.get(ExtensionIdentifier.toKey(extensionId)) ?? {
                    type: 'item',
                    label: ext.displayName ?? ext.name,
                    ordinal: 0 /* BucketOrdinal.Extension */,
                    picked: false,
                    source: tool.source,
                    children: []
                };
                toolBuckets.set(ExtensionIdentifier.toKey(ext.identifier), bucket);
            }
            else if (tool.source.type === 'internal') {
                bucket = defaultBucket;
            }
            else {
                assertNever(tool.source);
            }
            const picked = nowSelectedTools.has(tool);
            bucket.children.push({
                tool,
                parent: bucket,
                type: 'item',
                label: tool.displayName,
                description: tool.userDescription,
                picked,
                indented: true,
            });
            if (picked) {
                bucket.picked = true;
            }
        }
        function isBucketPick(obj) {
            return Boolean(obj.children);
        }
        function isToolPick(obj) {
            return Boolean(obj.tool);
        }
        function isAddPick(obj) {
            return Boolean(obj.run);
        }
        const store = new DisposableStore();
        const picks = [];
        for (const bucket of Array.from(toolBuckets.values()).sort((a, b) => a.ordinal - b.ordinal)) {
            picks.push({
                type: 'separator',
                label: bucket.status
            });
            picks.push(bucket);
            picks.push(...bucket.children);
        }
        const picker = store.add(quickPickService.createQuickPick({ useSeparators: true }));
        picker.placeholder = localize('placeholder', "Select tools that are available to chat");
        picker.canSelectMany = true;
        picker.keepScrollPosition = true;
        picker.matchOnDescription = true;
        if (picks.length === 0) {
            picker.placeholder = localize('noTools', "Add tools to chat");
            picker.canSelectMany = false;
            picks.push(addMcpPick, addExpPick);
        }
        else {
            picks.push({ type: 'separator' }, addPick);
        }
        let lastSelectedItems = new Set();
        let ignoreEvent = false;
        const _update = () => {
            ignoreEvent = true;
            try {
                const items = picks.filter((p) => p.type === 'item' && Boolean(p.picked));
                lastSelectedItems = new Set(items);
                picker.selectedItems = items;
                const disableBuckets = [];
                const disableTools = [];
                for (const item of picks) {
                    if (item.type === 'item' && !item.picked) {
                        if (isBucketPick(item)) {
                            disableBuckets.push(item.source);
                        }
                        else if (isToolPick(item) && item.parent.picked) {
                            disableTools.push(item.tool);
                        }
                    }
                }
                widget.input.selectedToolsModel.update(disableBuckets, disableTools);
            }
            finally {
                ignoreEvent = false;
            }
        };
        _update();
        picker.items = picks;
        picker.show();
        store.add(picker.onDidChangeSelection(selectedPicks => {
            if (ignoreEvent) {
                return;
            }
            const addPick = selectedPicks.find(isAddPick);
            if (addPick) {
                addPick.run();
                picker.hide();
                return;
            }
            const { added, removed } = diffSets(lastSelectedItems, new Set(selectedPicks));
            for (const item of added) {
                item.picked = true;
                if (isBucketPick(item)) {
                    // add server -> add back tools
                    for (const toolPick of item.children) {
                        toolPick.picked = true;
                    }
                }
                else if (isToolPick(item)) {
                    // add server when tool is picked
                    item.parent.picked = true;
                }
            }
            for (const item of removed) {
                item.picked = false;
                if (isBucketPick(item)) {
                    // removed server -> remove tools
                    for (const toolPick of item.children) {
                        toolPick.picked = false;
                    }
                }
                else if (isToolPick(item) && item.parent.children.every(child => !child.picked)) {
                    // remove LAST tool -> remove server
                    item.parent.picked = false;
                }
            }
            _update();
        }));
        store.add(picker.onDidAccept(() => {
            picker.activeItems.find(isAddPick)?.run();
        }));
        await Promise.race([Event.toPromise(Event.any(picker.onDidAccept, picker.onDidHide))]);
        telemetryService.publicLog2('chat/selectedTools', {
            enabled: widget.input.selectedToolsModel.tools.get().length,
            total: Iterable.length(toolsService.getTools()),
        });
        store.dispose();
    }
}
export function registerChatToolActions() {
    registerAction2(AcceptToolConfirmation);
    registerAction2(AttachToolsAction);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdFRvb2xBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDekYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFFOUYsT0FBTyxFQUFFLGtCQUFrQixFQUF1QyxNQUFNLHlEQUF5RCxDQUFDO0FBQ2xJLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxN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