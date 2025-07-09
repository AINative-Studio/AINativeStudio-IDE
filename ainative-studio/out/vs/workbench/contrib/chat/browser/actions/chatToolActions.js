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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRUb29sQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNyRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDdEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRTlGLE9BQU8sRUFBRSxrQkFBa0IsRUFBdUMsTUFBTSx5REFBeUQsQ0FBQztBQUNsSSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN6RixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN2RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsV0FBVyxFQUFjLGtCQUFrQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDOUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDckQsT0FBTyxFQUFFLDBCQUEwQixFQUE2QixNQUFNLDJDQUEyQyxDQUFDO0FBQ2xILE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUM3RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFjakQsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsa0NBQWtDLENBQUM7QUFFakYsTUFBTSxzQkFBdUIsU0FBUSxPQUFPO0lBQzNDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDhCQUE4QjtZQUNsQyxLQUFLLEVBQUUsU0FBUyxDQUFDLGFBQWEsRUFBRSxRQUFRLENBQUM7WUFDekMsRUFBRSxFQUFFLEtBQUs7WUFDVCxRQUFRLEVBQUUsYUFBYTtZQUN2QixVQUFVLEVBQUU7Z0JBQ1gsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLGFBQWEsRUFBRSxlQUFlLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDO2dCQUNwRyxPQUFPLEVBQUUsaURBQThCO2dCQUN2QyxvQ0FBb0M7Z0JBQ3BDLE1BQU0sRUFBRSw4Q0FBb0MsQ0FBQzthQUM3QztTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQVc7UUFDN0MsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDM0QsTUFBTSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsaUJBQWlCLENBQUM7UUFDbkQsTUFBTSxRQUFRLEdBQUcsTUFBTSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RCxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDN0IsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLHlCQUF5QixHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQStCLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLGdCQUFnQixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2pLLElBQUkseUJBQXlCLEVBQUUsQ0FBQztZQUMvQix5QkFBeUIsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BELENBQUM7UUFFRCxpRkFBaUY7UUFDakYsTUFBTSxFQUFFLFVBQVUsRUFBRSxDQUFDO0lBQ3RCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxpQkFBa0IsU0FBUSxPQUFPO2FBRTdCLE9BQUUsR0FBRyxtQ0FBbUMsQ0FBQztJQUV6RDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxFQUFFO1lBQ3hCLEtBQUssRUFBRSxRQUFRLENBQUMsT0FBTyxFQUFFLGlCQUFpQixDQUFDO1lBQzNDLElBQUksRUFBRSxPQUFPLENBQUMsS0FBSztZQUNuQixFQUFFLEVBQUUsS0FBSztZQUNULFFBQVEsRUFBRSxhQUFhO1lBQ3ZCLFlBQVksRUFBRSxlQUFlLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO1lBQ2hFLElBQUksRUFBRTtnQkFDTCxJQUFJLEVBQUUsZUFBZSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztnQkFDeEQsRUFBRSxFQUFFLE1BQU0sQ0FBQywwQkFBMEI7Z0JBQ3JDLEtBQUssRUFBRSxZQUFZO2dCQUNuQixLQUFLLEVBQUUsQ0FBQzthQUNSO1lBQ0QsVUFBVSxFQUFFO2dCQUNYLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsZUFBZSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUN6RyxPQUFPLEVBQUUsbURBQTZCLHlCQUFnQjtnQkFDdEQsTUFBTSwwQ0FBZ0M7YUFDdEM7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLEdBQUcsSUFBVztRQUU1RCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUMxRCxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUM5RCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUN6RCxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUMzRCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUN6RCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ3JELE1BQU0seUJBQXlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBRTVFLElBQUksTUFBTSxHQUFHLGlCQUFpQixDQUFDLGlCQUFpQixDQUFDO1FBQ2pELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUViLFNBQVMsbUJBQW1CLENBQUMsR0FBUTtnQkFDcEMsT0FBTyxHQUFHLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxJQUFLLEdBQXlCLENBQUMsTUFBTSxDQUFDO1lBQzVFLENBQUM7WUFDRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEIsSUFBSSxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNsQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztZQUN6QixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLEVBQXNCLENBQUM7UUFDdEQsS0FBSyxNQUFNLE1BQU0sSUFBSSxVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDL0MsS0FBSyxNQUFNLElBQUksSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUM7Z0JBQ3ZDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN0QyxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQVcsYUFBdUM7UUFBbEQsV0FBVyxhQUFhO1lBQUcsMkRBQVMsQ0FBQTtZQUFFLCtDQUFHLENBQUE7WUFBRSxtREFBSyxDQUFBO1FBQUMsQ0FBQyxFQUF2QyxhQUFhLEtBQWIsYUFBYSxRQUEwQjtRQU1sRCxNQUFNLFVBQVUsR0FBWSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxXQUFXLEVBQUUsbUJBQW1CLENBQUMsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1FBQ3JPLE1BQU0sVUFBVSxHQUFZLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLGNBQWMsRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxVQUFVLENBQUMsMkJBQTJCLENBQUMsRUFBRSxDQUFDO1FBQ3BQLE1BQU0sT0FBTyxHQUFZO1lBQ3hCLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsbUJBQW1CLENBQUMsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQzdJLE1BQU0sSUFBSSxHQUFHLE1BQU0sZ0JBQWdCLENBQUMsSUFBSSxDQUN2QyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsRUFDeEI7b0JBQ0MsV0FBVyxFQUFFLEtBQUs7b0JBQ2xCLEtBQUssRUFBRSxRQUFRLENBQUMsU0FBUyxFQUFFLG1CQUFtQixDQUFDO2lCQUMvQyxDQUNELENBQUM7Z0JBQ0YsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDO1lBQ2IsQ0FBQztTQUNELENBQUM7UUFFRixNQUFNLGFBQWEsR0FBZTtZQUNqQyxJQUFJLEVBQUUsTUFBTTtZQUNaLFFBQVEsRUFBRSxFQUFFO1lBQ1osS0FBSyxFQUFFLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxhQUFhLENBQUM7WUFDcEQsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUM1QixPQUFPLDZCQUFxQjtZQUM1QixNQUFNLEVBQUUsSUFBSTtTQUNaLENBQUM7UUFFRixNQUFNLGdCQUFnQixHQUFHLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDOUUsTUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLEVBQXNCLENBQUM7UUFFbEQsS0FBSyxNQUFNLElBQUksSUFBSSxZQUFZLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUM1QyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7Z0JBQzlCLFNBQVM7WUFDVixDQUFDO1lBRUQsSUFBSSxNQUFrQixDQUFDO1lBRXZCLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssS0FBSyxFQUFFLENBQUM7Z0JBQ2hDLE1BQU0sU0FBUyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUMvQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQ2hCLFNBQVM7Z0JBQ1YsQ0FBQztnQkFDRCxNQUFNLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxJQUFJO29CQUNwRCxJQUFJLEVBQUUsTUFBTTtvQkFDWixLQUFLLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQztvQkFDM0UsTUFBTSxFQUFFLFFBQVEsQ0FBQyxXQUFXLEVBQUUsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsa0JBQWtCLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztvQkFDekksT0FBTywyQkFBbUI7b0JBQzFCLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtvQkFDbkIsTUFBTSxFQUFFLEtBQUs7b0JBQ2IsUUFBUSxFQUFFLEVBQUU7aUJBQ1osQ0FBQztnQkFDRixXQUFXLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ2xELENBQUM7aUJBQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxXQUFXLEVBQUUsQ0FBQztnQkFDN0MsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUM7Z0JBQzVDLE1BQU0sR0FBRyxHQUFHLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUNqSCxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7b0JBQ1YsU0FBUztnQkFDVixDQUFDO2dCQUVELE1BQU0sR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJO29CQUNuRSxJQUFJLEVBQUUsTUFBTTtvQkFDWixLQUFLLEVBQUUsR0FBRyxDQUFDLFdBQVcsSUFBSSxHQUFHLENBQUMsSUFBSTtvQkFDbEMsT0FBTyxpQ0FBeUI7b0JBQ2hDLE1BQU0sRUFBRSxLQUFLO29CQUNiLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtvQkFDbkIsUUFBUSxFQUFFLEVBQUU7aUJBQ1osQ0FBQztnQkFDRixXQUFXLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDcEUsQ0FBQztpQkFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLFVBQVUsRUFBRSxDQUFDO2dCQUM1QyxNQUFNLEdBQUcsYUFBYSxDQUFDO1lBQ3hCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzFCLENBQUM7WUFFRCxNQUFNLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFMUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7Z0JBQ3BCLElBQUk7Z0JBQ0osTUFBTSxFQUFFLE1BQU07Z0JBQ2QsSUFBSSxFQUFFLE1BQU07Z0JBQ1osS0FBSyxFQUFFLElBQUksQ0FBQyxXQUFXO2dCQUN2QixXQUFXLEVBQUUsSUFBSSxDQUFDLGVBQWU7Z0JBQ2pDLE1BQU07Z0JBQ04sUUFBUSxFQUFFLElBQUk7YUFDZCxDQUFDLENBQUM7WUFFSCxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLE1BQU0sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO1lBQ3RCLENBQUM7UUFDRixDQUFDO1FBRUQsU0FBUyxZQUFZLENBQUMsR0FBUTtZQUM3QixPQUFPLE9BQU8sQ0FBRSxHQUFrQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzlDLENBQUM7UUFDRCxTQUFTLFVBQVUsQ0FBQyxHQUFRO1lBQzNCLE9BQU8sT0FBTyxDQUFFLEdBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDeEMsQ0FBQztRQUNELFNBQVMsU0FBUyxDQUFDLEdBQVE7WUFDMUIsT0FBTyxPQUFPLENBQUUsR0FBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RDLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBRXBDLE1BQU0sS0FBSyxHQUFxQyxFQUFFLENBQUM7UUFFbkQsS0FBSyxNQUFNLE1BQU0sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDN0YsS0FBSyxDQUFDLElBQUksQ0FBQztnQkFDVixJQUFJLEVBQUUsV0FBVztnQkFDakIsS0FBSyxFQUFFLE1BQU0sQ0FBQyxNQUFNO2FBQ3BCLENBQUMsQ0FBQztZQUVILEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbkIsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNoQyxDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQVMsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVGLE1BQU0sQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLGFBQWEsRUFBRSx5Q0FBeUMsQ0FBQyxDQUFDO1FBQ3hGLE1BQU0sQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO1FBQzVCLE1BQU0sQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUM7UUFDakMsTUFBTSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQztRQUVqQyxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDeEIsTUFBTSxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsU0FBUyxFQUFFLG1CQUFtQixDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUM7WUFDN0IsS0FBSyxDQUFDLElBQUksQ0FDVCxVQUFVLEVBQ1YsVUFBVSxDQUNWLENBQUM7UUFDSCxDQUFDO2FBQU0sQ0FBQztZQUNQLEtBQUssQ0FBQyxJQUFJLENBQ1QsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLEVBQ3JCLE9BQU8sQ0FDUCxDQUFDO1FBQ0gsQ0FBQztRQUdELElBQUksaUJBQWlCLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUMxQyxJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUM7UUFFeEIsTUFBTSxPQUFPLEdBQUcsR0FBRyxFQUFFO1lBQ3BCLFdBQVcsR0FBRyxJQUFJLENBQUM7WUFDbkIsSUFBSSxDQUFDO2dCQUNKLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssTUFBTSxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztnQkFDdkYsaUJBQWlCLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ25DLE1BQU0sQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDO2dCQUU3QixNQUFNLGNBQWMsR0FBcUIsRUFBRSxDQUFDO2dCQUM1QyxNQUFNLFlBQVksR0FBZ0IsRUFBRSxDQUFDO2dCQUNyQyxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO29CQUMxQixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO3dCQUMxQyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDOzRCQUN4QixjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQzt3QkFDbEMsQ0FBQzs2QkFBTSxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDOzRCQUNuRCxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDOUIsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7Z0JBRUQsTUFBTSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQ3RFLENBQUM7b0JBQVMsQ0FBQztnQkFDVixXQUFXLEdBQUcsS0FBSyxDQUFDO1lBQ3JCLENBQUM7UUFDRixDQUFDLENBQUM7UUFFRixPQUFPLEVBQUUsQ0FBQztRQUNWLE1BQU0sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ3JCLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUVkLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLGFBQWEsQ0FBQyxFQUFFO1lBQ3JELElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2pCLE9BQU87WUFDUixDQUFDO1lBRUQsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUM5QyxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNiLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDZCxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2QsT0FBTztZQUNSLENBQUM7WUFFRCxNQUFNLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1lBRS9FLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQzFCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO2dCQUVuQixJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUN4QiwrQkFBK0I7b0JBQy9CLEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO3dCQUN0QyxRQUFRLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztvQkFDeEIsQ0FBQztnQkFDRixDQUFDO3FCQUFNLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQzdCLGlDQUFpQztvQkFDakMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO2dCQUMzQixDQUFDO1lBQ0YsQ0FBQztZQUVELEtBQUssTUFBTSxJQUFJLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQzVCLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO2dCQUVwQixJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUN4QixpQ0FBaUM7b0JBQ2pDLEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO3dCQUN0QyxRQUFRLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztvQkFDekIsQ0FBQztnQkFDRixDQUFDO3FCQUFNLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7b0JBQ25GLG9DQUFvQztvQkFDcEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO2dCQUM1QixDQUFDO1lBQ0YsQ0FBQztZQUVELE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUU7WUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDM0MsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2RixnQkFBZ0IsQ0FBQyxVQUFVLENBQStDLG9CQUFvQixFQUFFO1lBQy9GLE9BQU8sRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNO1lBQzNELEtBQUssRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQztTQUMvQyxDQUFDLENBQUM7UUFDSCxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDakIsQ0FBQzs7QUFHRixNQUFNLFVBQVUsdUJBQXVCO0lBQ3RDLGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0lBQ3hDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQ3BDLENBQUMifQ==