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
import { toAction } from '../../../../../base/common/actions.js';
import { coalesce } from '../../../../../base/common/arrays.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { fromNowByDay, safeIntl } from '../../../../../base/common/date.js';
import { Event } from '../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore, markAsSingleton } from '../../../../../base/common/lifecycle.js';
import { language } from '../../../../../base/common/platform.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { URI } from '../../../../../base/common/uri.js';
import { EditorAction2 } from '../../../../../editor/browser/editorExtensions.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { SuggestController } from '../../../../../editor/contrib/suggest/browser/suggestController.js';
import { localize, localize2 } from '../../../../../nls.js';
import { IActionViewItemService } from '../../../../../platform/actions/browser/actionViewItemService.js';
import { DropdownWithPrimaryActionViewItem } from '../../../../../platform/actions/browser/dropdownWithPrimaryActionViewItem.js';
import { Action2, MenuId, MenuItemAction, registerAction2, SubmenuItemAction } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IsLinuxContext, IsWindowsContext } from '../../../../../platform/contextkey/common/contextkeys.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import product from '../../../../../platform/product/common/product.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { ToggleTitleBarConfigAction } from '../../../../browser/parts/titlebar/titlebarActions.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { ACTIVE_GROUP, IEditorService } from '../../../../services/editor/common/editorService.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { IWorkbenchLayoutService } from '../../../../services/layout/browser/layoutService.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { EXTENSIONS_CATEGORY, IExtensionsWorkbenchService } from '../../../extensions/common/extensions.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { ChatEntitlement, ChatSentiment, IChatEntitlementService } from '../../common/chatEntitlementService.js';
import { extractAgentAndCommand } from '../../common/chatParserTypes.js';
import { IChatService } from '../../common/chatService.js';
import { isRequestVM } from '../../common/chatViewModel.js';
import { IChatWidgetHistoryService } from '../../common/chatWidgetHistoryService.js';
import { ChatMode, validateChatMode } from '../../common/constants.js';
import { CopilotUsageExtensionFeatureId } from '../../common/languageModelStats.js';
import { ILanguageModelToolsService } from '../../common/languageModelToolsService.js';
import { ChatViewId, EditsViewId, IChatWidgetService, showChatView, showCopilotView } from '../chat.js';
import { ChatEditorInput } from '../chatEditorInput.js';
import { convertBufferToScreenshotVariable } from '../contrib/screenshot.js';
import { clearChatEditor } from './chatClear.js';
export const CHAT_CATEGORY = localize2('chat.category', 'Chat');
export const CHAT_OPEN_ACTION_ID = 'workbench.action.chat.open';
export const CHAT_SETUP_ACTION_ID = 'workbench.action.chat.triggerSetup';
const TOGGLE_CHAT_ACTION_ID = 'workbench.action.chat.toggle';
export const OPEN_CHAT_QUOTA_EXCEEDED_DIALOG = 'workbench.action.chat.openQuotaExceededDialog';
export function registerChatActions() {
    registerAction2(class OpenChatGlobalAction extends Action2 {
        constructor() {
            super({
                id: CHAT_OPEN_ACTION_ID,
                title: localize2('openChat', "Open Chat"),
                icon: Codicon.copilot,
                f1: true,
                category: CHAT_CATEGORY,
                precondition: ChatContextKeys.Setup.hidden.toNegated(),
                keybinding: {
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 39 /* KeyCode.KeyI */,
                    mac: {
                        primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 39 /* KeyCode.KeyI */
                    }
                },
                menu: {
                    id: MenuId.ChatTitleBarMenu,
                    group: 'a_open',
                    order: 1
                }
            });
        }
        async run(accessor, opts) {
            opts = typeof opts === 'string' ? { query: opts } : opts;
            const chatService = accessor.get(IChatService);
            const toolsService = accessor.get(ILanguageModelToolsService);
            const viewsService = accessor.get(IViewsService);
            const hostService = accessor.get(IHostService);
            const chatWidget = await showChatView(viewsService);
            if (!chatWidget) {
                return;
            }
            if (opts?.mode && validateChatMode(opts.mode)) {
                chatWidget.input.setChatMode(opts.mode);
            }
            if (opts?.previousRequests?.length && chatWidget.viewModel) {
                for (const { request, response } of opts.previousRequests) {
                    chatService.addCompleteRequest(chatWidget.viewModel.sessionId, request, undefined, 0, { message: response });
                }
            }
            if (opts?.attachScreenshot) {
                const screenshot = await hostService.getScreenshot();
                if (screenshot) {
                    chatWidget.attachmentModel.addContext(convertBufferToScreenshotVariable(screenshot));
                }
            }
            if (opts?.query) {
                if (opts.isPartialQuery) {
                    chatWidget.setInput(opts.query);
                }
                else {
                    chatWidget.acceptInput(opts.query);
                }
            }
            if (opts?.toolIds && opts.toolIds.length > 0) {
                for (const toolId of opts.toolIds) {
                    const tool = toolsService.getTool(toolId);
                    if (tool) {
                        chatWidget.attachmentModel.addContext({
                            id: tool.id,
                            name: tool.displayName,
                            fullName: tool.displayName,
                            value: undefined,
                            icon: ThemeIcon.isThemeIcon(tool.icon) ? tool.icon : undefined,
                            isTool: true
                        });
                    }
                }
            }
            chatWidget.focusInput();
        }
    });
    registerAction2(class ToggleChatAction extends Action2 {
        constructor() {
            super({
                id: TOGGLE_CHAT_ACTION_ID,
                title: localize2('toggleChat', "Toggle Chat"),
                category: CHAT_CATEGORY
            });
        }
        async run(accessor) {
            const layoutService = accessor.get(IWorkbenchLayoutService);
            const viewsService = accessor.get(IViewsService);
            const viewDescriptorService = accessor.get(IViewDescriptorService);
            const chatLocation = viewDescriptorService.getViewLocationById(ChatViewId);
            const editsLocation = viewDescriptorService.getViewLocationById(EditsViewId);
            if (viewsService.isViewVisible(ChatViewId) || (chatLocation === editsLocation && viewsService.isViewVisible(EditsViewId))) {
                this.updatePartVisibility(layoutService, chatLocation, false);
            }
            else {
                this.updatePartVisibility(layoutService, chatLocation, true);
                (await showCopilotView(viewsService, layoutService))?.focusInput();
            }
        }
        updatePartVisibility(layoutService, location, visible) {
            let part;
            switch (location) {
                case 1 /* ViewContainerLocation.Panel */:
                    part = "workbench.parts.panel" /* Parts.PANEL_PART */;
                    break;
                case 0 /* ViewContainerLocation.Sidebar */:
                    part = "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */;
                    break;
                case 2 /* ViewContainerLocation.AuxiliaryBar */:
                    part = "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */;
                    break;
            }
            if (part) {
                layoutService.setPartHidden(!visible, part);
            }
        }
    });
    registerAction2(class ChatHistoryAction extends Action2 {
        constructor() {
            super({
                id: `workbench.action.chat.history`,
                title: localize2('chat.history.label', "Show Chats..."),
                menu: {
                    id: MenuId.ViewTitle,
                    when: ContextKeyExpr.equals('view', ChatViewId),
                    group: 'navigation',
                    order: 2
                },
                category: CHAT_CATEGORY,
                icon: Codicon.history,
                f1: true,
                precondition: ChatContextKeys.enabled
            });
        }
        async run(accessor) {
            const chatService = accessor.get(IChatService);
            const quickInputService = accessor.get(IQuickInputService);
            const viewsService = accessor.get(IViewsService);
            const editorService = accessor.get(IEditorService);
            const dialogService = accessor.get(IDialogService);
            const view = await viewsService.openView(ChatViewId);
            if (!view) {
                return;
            }
            const chatSessionId = view.widget.viewModel?.model.sessionId;
            if (!chatSessionId) {
                return;
            }
            const editingSession = view.widget.viewModel?.model.editingSession;
            if (editingSession) {
                const phrase = localize('switchChat.confirmPhrase', "Switching chats will end your current edit session.");
                if (!await handleCurrentEditingSession(editingSession, phrase, dialogService)) {
                    return;
                }
            }
            const showPicker = async () => {
                const openInEditorButton = {
                    iconClass: ThemeIcon.asClassName(Codicon.file),
                    tooltip: localize('interactiveSession.history.editor', "Open in Editor"),
                };
                const deleteButton = {
                    iconClass: ThemeIcon.asClassName(Codicon.x),
                    tooltip: localize('interactiveSession.history.delete', "Delete"),
                };
                const renameButton = {
                    iconClass: ThemeIcon.asClassName(Codicon.pencil),
                    tooltip: localize('chat.history.rename', "Rename"),
                };
                const getPicks = async () => {
                    const items = await chatService.getHistory();
                    items.sort((a, b) => (b.lastMessageDate ?? 0) - (a.lastMessageDate ?? 0));
                    let lastDate = undefined;
                    const picks = items.flatMap((i) => {
                        const timeAgoStr = fromNowByDay(i.lastMessageDate, true, true);
                        const separator = timeAgoStr !== lastDate ? {
                            type: 'separator', label: timeAgoStr,
                        } : undefined;
                        lastDate = timeAgoStr;
                        return [
                            separator,
                            {
                                label: i.title,
                                description: i.isActive ? `(${localize('currentChatLabel', 'current')})` : '',
                                chat: i,
                                buttons: i.isActive ? [renameButton] : [
                                    renameButton,
                                    openInEditorButton,
                                    deleteButton,
                                ]
                            }
                        ];
                    });
                    return coalesce(picks);
                };
                const store = new DisposableStore();
                const picker = store.add(quickInputService.createQuickPick({ useSeparators: true }));
                picker.placeholder = localize('interactiveSession.history.pick', "Switch to chat");
                const picks = await getPicks();
                picker.items = picks;
                store.add(picker.onDidTriggerItemButton(async (context) => {
                    if (context.button === openInEditorButton) {
                        const options = { target: { sessionId: context.item.chat.sessionId }, pinned: true };
                        editorService.openEditor({ resource: ChatEditorInput.getNewEditorUri(), options }, ACTIVE_GROUP);
                        picker.hide();
                    }
                    else if (context.button === deleteButton) {
                        chatService.removeHistoryEntry(context.item.chat.sessionId);
                        picker.items = await getPicks();
                    }
                    else if (context.button === renameButton) {
                        const title = await quickInputService.input({ title: localize('newChatTitle', "New chat title"), value: context.item.chat.title });
                        if (title) {
                            chatService.setChatSessionTitle(context.item.chat.sessionId, title);
                        }
                        // The quick input hides the picker, it gets disposed, so we kick it off from scratch
                        await showPicker();
                    }
                }));
                store.add(picker.onDidAccept(async () => {
                    try {
                        const item = picker.selectedItems[0];
                        const sessionId = item.chat.sessionId;
                        await view.loadSession(sessionId);
                    }
                    finally {
                        picker.hide();
                    }
                }));
                store.add(picker.onDidHide(() => store.dispose()));
                picker.show();
            };
            await showPicker();
        }
    });
    registerAction2(class OpenChatEditorAction extends Action2 {
        constructor() {
            super({
                id: `workbench.action.openChat`,
                title: localize2('interactiveSession.open', "Open Editor"),
                f1: true,
                category: CHAT_CATEGORY,
                precondition: ChatContextKeys.enabled
            });
        }
        async run(accessor) {
            const editorService = accessor.get(IEditorService);
            await editorService.openEditor({ resource: ChatEditorInput.getNewEditorUri(), options: { pinned: true } });
        }
    });
    registerAction2(class ChatAddAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.addParticipant',
                title: localize2('chatWith', "Chat with Extension"),
                icon: Codicon.mention,
                f1: false,
                category: CHAT_CATEGORY,
                menu: {
                    id: MenuId.ChatInput,
                    when: ChatContextKeys.chatMode.isEqualTo(ChatMode.Ask),
                    group: 'navigation',
                    order: 1
                }
            });
        }
        async run(accessor, ...args) {
            const widgetService = accessor.get(IChatWidgetService);
            const context = args[0];
            const widget = context?.widget ?? widgetService.lastFocusedWidget;
            if (!widget) {
                return;
            }
            const hasAgentOrCommand = extractAgentAndCommand(widget.parsedInput);
            if (hasAgentOrCommand?.agentPart || hasAgentOrCommand?.commandPart) {
                return;
            }
            const suggestCtrl = SuggestController.get(widget.inputEditor);
            if (suggestCtrl) {
                const curText = widget.inputEditor.getValue();
                const newValue = curText ? `@ ${curText}` : '@';
                if (!curText.startsWith('@')) {
                    widget.inputEditor.setValue(newValue);
                }
                widget.inputEditor.setPosition(new Position(1, 2));
                suggestCtrl.triggerSuggest(undefined, true);
            }
        }
    });
    registerAction2(class ClearChatInputHistoryAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.clearInputHistory',
                title: localize2('interactiveSession.clearHistory.label', "Clear Input History"),
                precondition: ChatContextKeys.enabled,
                category: CHAT_CATEGORY,
                f1: true,
            });
        }
        async run(accessor, ...args) {
            const historyService = accessor.get(IChatWidgetHistoryService);
            historyService.clearHistory();
        }
    });
    registerAction2(class ClearChatHistoryAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.clearHistory',
                title: localize2('chat.clear.label', "Clear All Workspace Chats"),
                precondition: ChatContextKeys.enabled,
                category: CHAT_CATEGORY,
                f1: true,
            });
        }
        async run(accessor, ...args) {
            const editorGroupsService = accessor.get(IEditorGroupsService);
            const chatService = accessor.get(IChatService);
            const instantiationService = accessor.get(IInstantiationService);
            const widgetService = accessor.get(IChatWidgetService);
            await chatService.clearAllHistoryEntries();
            widgetService.getAllWidgets().forEach(widget => {
                widget.clear();
            });
            // Clear all chat editors. Have to go this route because the chat editor may be in the background and
            // not have a ChatEditorInput.
            editorGroupsService.groups.forEach(group => {
                group.editors.forEach(editor => {
                    if (editor instanceof ChatEditorInput) {
                        instantiationService.invokeFunction(clearChatEditor, editor);
                    }
                });
            });
        }
    });
    registerAction2(class FocusChatAction extends EditorAction2 {
        constructor() {
            super({
                id: 'chat.action.focus',
                title: localize2('actions.interactiveSession.focus', 'Focus Chat List'),
                precondition: ContextKeyExpr.and(ChatContextKeys.inChatInput),
                category: CHAT_CATEGORY,
                keybinding: [
                    // On mac, require that the cursor is at the top of the input, to avoid stealing cmd+up to move the cursor to the top
                    {
                        when: ContextKeyExpr.and(ChatContextKeys.inputCursorAtTop, ChatContextKeys.inQuickChat.negate()),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                        weight: 100 /* KeybindingWeight.EditorContrib */,
                    },
                    // On win/linux, ctrl+up can always focus the chat list
                    {
                        when: ContextKeyExpr.and(ContextKeyExpr.or(IsWindowsContext, IsLinuxContext), ChatContextKeys.inQuickChat.negate()),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                        weight: 100 /* KeybindingWeight.EditorContrib */,
                    },
                    {
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.inQuickChat),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    }
                ]
            });
        }
        runEditorCommand(accessor, editor) {
            const editorUri = editor.getModel()?.uri;
            if (editorUri) {
                const widgetService = accessor.get(IChatWidgetService);
                widgetService.getWidgetByInputUri(editorUri)?.focusLastMessage();
            }
        }
    });
    registerAction2(class FocusChatInputAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.focusInput',
                title: localize2('interactiveSession.focusInput.label', "Focus Chat Input"),
                f1: false,
                keybinding: [
                    {
                        primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.inChatInput.negate(), ChatContextKeys.inQuickChat.negate()),
                    },
                    {
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.inChatInput.negate(), ChatContextKeys.inQuickChat),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    }
                ]
            });
        }
        run(accessor, ...args) {
            const widgetService = accessor.get(IChatWidgetService);
            widgetService.lastFocusedWidget?.focusInput();
        }
    });
    const nonEnterpriseCopilotUsers = ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.notEquals(`config.${defaultChat.completionsAdvancedSetting}.authProvider`, defaultChat.enterpriseProviderId));
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.manageSettings',
                title: localize2('manageCopilot', "Manage Copilot"),
                category: CHAT_CATEGORY,
                f1: true,
                precondition: ContextKeyExpr.and(ContextKeyExpr.or(ChatContextKeys.Entitlement.limited, ChatContextKeys.Entitlement.pro), nonEnterpriseCopilotUsers),
                menu: {
                    id: MenuId.ChatTitleBarMenu,
                    group: 'y_manage',
                    order: 1,
                    when: nonEnterpriseCopilotUsers
                }
            });
        }
        async run(accessor) {
            const openerService = accessor.get(IOpenerService);
            openerService.open(URI.parse(defaultChat.manageSettingsUrl));
        }
    });
    registerAction2(class ShowExtensionsUsingCopilot extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.showExtensionsUsingCopilot',
                title: localize2('showCopilotUsageExtensions', "Show Extensions using Copilot"),
                f1: true,
                category: EXTENSIONS_CATEGORY,
                precondition: ChatContextKeys.enabled
            });
        }
        async run(accessor) {
            const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
            extensionsWorkbenchService.openSearch(`@feature:${CopilotUsageExtensionFeatureId}`);
        }
    });
    registerAction2(class ConfigureCopilotCompletions extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.configureCodeCompletions',
                title: localize2('configureCompletions', "Configure Code Completions..."),
                precondition: ChatContextKeys.Setup.installed,
                menu: {
                    id: MenuId.ChatTitleBarMenu,
                    group: 'f_completions',
                    order: 10,
                }
            });
        }
        async run(accessor) {
            const commandService = accessor.get(ICommandService);
            commandService.executeCommand(defaultChat.completionsMenuCommand);
        }
    });
    registerAction2(class ShowLimitReachedDialogAction extends Action2 {
        constructor() {
            super({
                id: OPEN_CHAT_QUOTA_EXCEEDED_DIALOG,
                title: localize('upgradeChat', "Upgrade to Copilot Pro")
            });
        }
        async run(accessor) {
            const chatEntitlementService = accessor.get(IChatEntitlementService);
            const commandService = accessor.get(ICommandService);
            const dialogService = accessor.get(IDialogService);
            const telemetryService = accessor.get(ITelemetryService);
            const dateFormatter = safeIntl.DateTimeFormat(language, { year: 'numeric', month: 'long', day: 'numeric' });
            let message;
            const { chatQuotaExceeded, completionsQuotaExceeded } = chatEntitlementService.quotas;
            if (chatQuotaExceeded && !completionsQuotaExceeded) {
                message = localize('chatQuotaExceeded', "You've run out of free chat messages. You still have free code completions available in the Copilot Free plan. These limits will reset on {0}.", dateFormatter.format(chatEntitlementService.quotas.quotaResetDate));
            }
            else if (completionsQuotaExceeded && !chatQuotaExceeded) {
                message = localize('completionsQuotaExceeded', "You've run out of free code completions. You still have free chat messages available in the Copilot Free plan. These limits will reset on {0}.", dateFormatter.format(chatEntitlementService.quotas.quotaResetDate));
            }
            else {
                message = localize('chatAndCompletionsQuotaExceeded', "You've reached the limit of the Copilot Free plan. These limits will reset on {0}.", dateFormatter.format(chatEntitlementService.quotas.quotaResetDate));
            }
            const upgradeToPro = localize('upgradeToPro', "Upgrade to Copilot Pro (your first 30 days are free) for:\n- Unlimited code completions\n- Unlimited chat messages\n- Access to additional models");
            await dialogService.prompt({
                type: 'none',
                message: localize('copilotFree', "Copilot Limit Reached"),
                cancelButton: {
                    label: localize('dismiss', "Dismiss"),
                    run: () => { }
                },
                buttons: [
                    {
                        label: localize('upgradePro', "Upgrade to Copilot Pro"),
                        run: () => {
                            const commandId = 'workbench.action.chat.upgradePlan';
                            telemetryService.publicLog2('workbenchActionExecuted', { id: commandId, from: 'chat-dialog' });
                            commandService.executeCommand(commandId);
                        }
                    },
                ],
                custom: {
                    icon: Codicon.copilotWarningLarge,
                    markdownDetails: [
                        { markdown: new MarkdownString(message, true) },
                        { markdown: new MarkdownString(upgradeToPro, true) }
                    ]
                }
            });
        }
    });
}
export function stringifyItem(item, includeName = true) {
    if (isRequestVM(item)) {
        return (includeName ? `${item.username}: ` : '') + item.messageText;
    }
    else {
        return (includeName ? `${item.username}: ` : '') + item.response.toString();
    }
}
// --- Title Bar Copilot Controls
const defaultChat = {
    documentationUrl: product.defaultChatAgent?.documentationUrl ?? '',
    manageSettingsUrl: product.defaultChatAgent?.manageSettingsUrl ?? '',
    managePlanUrl: product.defaultChatAgent?.managePlanUrl ?? '',
    enterpriseProviderId: product.defaultChatAgent?.enterpriseProviderId ?? '',
    completionsAdvancedSetting: product.defaultChatAgent?.completionsAdvancedSetting ?? '',
    completionsMenuCommand: product.defaultChatAgent?.completionsMenuCommand ?? '',
};
// // Add next to the command center if command center is disabled
// Void commented this out with /* */ - copilot head
/* MenuRegistry.appendMenuItem(MenuId.CommandCenter, {
    submenu: MenuId.ChatTitleBarMenu,
    title: localize('title4', "Copilot"),
    icon: Codicon.copilot,
    when: ContextKeyExpr.and(
        ChatContextKeys.supported,
        ContextKeyExpr.has('config.chat.commandCenter.enabled')
    ),
    order: 10001 // to the right of command center
});

// Add to the global title bar if command center is disabled
MenuRegistry.appendMenuItem(MenuId.TitleBar, {
    submenu: MenuId.ChatTitleBarMenu,
    title: localize('title4', "Copilot"),
    group: 'navigation',
    icon: Codicon.copilot,
    when: ContextKeyExpr.and(
        ChatContextKeys.supported,
        ContextKeyExpr.has('config.chat.commandCenter.enabled'),
        ContextKeyExpr.has('config.window.commandCenter').negate(),
    ),
    order: 1
}); */
registerAction2(class ToggleCopilotControl extends ToggleTitleBarConfigAction {
    constructor() {
        super('chat.commandCenter.enabled', localize('toggle.chatControl', 'Copilot Controls'), localize('toggle.chatControlsDescription', "Toggle visibility of the Copilot Controls in title bar"), 5, false, ChatContextKeys.supported);
    }
});
registerAction2(class ResetTrustedToolsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.resetTrustedTools',
            title: localize2('resetTrustedTools', "Reset Tool Confirmations"),
            category: CHAT_CATEGORY,
            f1: true,
        });
    }
    run(accessor) {
        accessor.get(ILanguageModelToolsService).resetToolAutoConfirmation();
        accessor.get(INotificationService).info(localize('resetTrustedToolsSuccess', "Tool confirmation preferences have been reset."));
    }
});
let CopilotTitleBarMenuRendering = class CopilotTitleBarMenuRendering extends Disposable {
    static { this.ID = 'workbench.contrib.copilotTitleBarMenuRendering'; }
    constructor(actionViewItemService, instantiationService, chatEntitlementService, configurationService) {
        super();
        const disposable = actionViewItemService.register(MenuId.CommandCenter, MenuId.ChatTitleBarMenu, (action, options) => {
            if (!(action instanceof SubmenuItemAction)) {
                return undefined;
            }
            const dropdownAction = toAction({
                id: 'copilot.titleBarMenuRendering.more',
                label: localize('more', "More..."),
                run() { }
            });
            const chatExtensionInstalled = chatEntitlementService.sentiment === ChatSentiment.Installed;
            const chatHidden = chatEntitlementService.sentiment === ChatSentiment.Disabled;
            const { chatQuotaExceeded, completionsQuotaExceeded } = chatEntitlementService.quotas;
            const signedOut = chatEntitlementService.entitlement === ChatEntitlement.Unknown;
            const setupFromDialog = configurationService.getValue('chat.setupFromDialog');
            let primaryActionId = TOGGLE_CHAT_ACTION_ID;
            let primaryActionTitle = localize('toggleChat', "Toggle Chat");
            let primaryActionIcon = Codicon.copilot;
            if (!chatExtensionInstalled && (!setupFromDialog || chatHidden)) {
                primaryActionId = CHAT_SETUP_ACTION_ID;
                primaryActionTitle = localize('triggerChatSetup', "Use AI Features with Copilot for free...");
            }
            else if (chatExtensionInstalled && signedOut) {
                primaryActionId = setupFromDialog ? CHAT_SETUP_ACTION_ID : TOGGLE_CHAT_ACTION_ID;
                primaryActionTitle = localize('signInToChatSetup', "Sign in to use Copilot...");
                primaryActionIcon = Codicon.copilotNotConnected;
            }
            else if (chatExtensionInstalled && (chatQuotaExceeded || completionsQuotaExceeded)) {
                primaryActionId = OPEN_CHAT_QUOTA_EXCEEDED_DIALOG;
                if (chatQuotaExceeded && !completionsQuotaExceeded) {
                    primaryActionTitle = localize('chatQuotaExceededButton', "Monthly chat messages limit reached. Click for details.");
                }
                else if (completionsQuotaExceeded && !chatQuotaExceeded) {
                    primaryActionTitle = localize('completionsQuotaExceededButton', "Monthly code completions limit reached. Click for details.");
                }
                else {
                    primaryActionTitle = localize('chatAndCompletionsQuotaExceededButton', "Copilot Free plan limit reached. Click for details.");
                }
                primaryActionIcon = Codicon.copilotWarning;
            }
            return instantiationService.createInstance(DropdownWithPrimaryActionViewItem, instantiationService.createInstance(MenuItemAction, {
                id: primaryActionId,
                title: primaryActionTitle,
                icon: primaryActionIcon,
            }, undefined, undefined, undefined, undefined), dropdownAction, action.actions, '', { ...options, skipTelemetry: true });
        }, Event.any(chatEntitlementService.onDidChangeSentiment, chatEntitlementService.onDidChangeQuotaExceeded, chatEntitlementService.onDidChangeEntitlement, Event.filter(configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('chat.setupFromDialog'))));
        // Reduces flicker a bit on reload/restart
        markAsSingleton(disposable);
    }
};
CopilotTitleBarMenuRendering = __decorate([
    __param(0, IActionViewItemService),
    __param(1, IInstantiationService),
    __param(2, IChatEntitlementService),
    __param(3, IConfigurationService)
], CopilotTitleBarMenuRendering);
export { CopilotTitleBarMenuRendering };
export function getEditsViewId(accessor) {
    const chatService = accessor.get(IChatService);
    return chatService.unifiedViewEnabled ? ChatViewId : EditsViewId;
}
/**
 * Returns whether we can continue clearing/switching chat sessions, false to cancel.
 */
export async function handleCurrentEditingSession(currentEditingSession, phrase, dialogService) {
    if (shouldShowClearEditingSessionConfirmation(currentEditingSession)) {
        return showClearEditingSessionConfirmation(currentEditingSession, dialogService, { messageOverride: phrase });
    }
    return true;
}
export async function showClearEditingSessionConfirmation(editingSession, dialogService, options) {
    const defaultPhrase = localize('chat.startEditing.confirmation.pending.message.default', "Starting a new chat will end your current edit session.");
    const defaultTitle = localize('chat.startEditing.confirmation.title', "Start new chat?");
    const phrase = options?.messageOverride ?? defaultPhrase;
    const title = options?.titleOverride ?? defaultTitle;
    const currentEdits = editingSession.entries.get();
    const undecidedEdits = currentEdits.filter((edit) => edit.state.get() === 0 /* WorkingSetEntryState.Modified */);
    const { result } = await dialogService.prompt({
        title,
        message: phrase + ' ' + localize('chat.startEditing.confirmation.pending.message.2', "Do you want to keep pending edits to {0} files?", undecidedEdits.length),
        type: 'info',
        cancelButton: true,
        buttons: [
            {
                label: localize('chat.startEditing.confirmation.acceptEdits', "Keep & Continue"),
                run: async () => {
                    await editingSession.accept();
                    return true;
                }
            },
            {
                label: localize('chat.startEditing.confirmation.discardEdits', "Undo & Continue"),
                run: async () => {
                    await editingSession.reject();
                    return true;
                }
            }
        ],
    });
    return Boolean(result);
}
export function shouldShowClearEditingSessionConfirmation(editingSession) {
    const currentEdits = editingSession.entries.get();
    const currentEditCount = currentEdits.length;
    if (currentEditCount) {
        const undecidedEdits = currentEdits.filter((edit) => edit.state.get() === 0 /* WorkingSetEntryState.Modified */);
        return !!undecidedEdits.length;
    }
    return false;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBdUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN0SSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUUzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV4RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9FQUFvRSxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDNUQsT0FBTyxFQUFFLHNCQUFz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