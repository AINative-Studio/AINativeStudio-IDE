/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { ChatContextKeyExprs, ChatContextKeys } from '../../common/chatContextKeys.js';
import { chatVariableLeader } from '../../common/chatParserTypes.js';
import { IChatService } from '../../common/chatService.js';
import { ChatAgentLocation, ChatConfiguration, ChatMode, validateChatMode } from '../../common/constants.js';
import { ILanguageModelToolsService } from '../../common/languageModelToolsService.js';
import { EditsViewId, IChatWidgetService } from '../chat.js';
import { getEditingSessionContext } from '../chatEditing/chatEditingActions.js';
import { CHAT_CATEGORY, handleCurrentEditingSession } from './chatActions.js';
import { ACTION_ID_NEW_CHAT, ChatDoneActionId, waitForChatSessionCleared } from './chatClearActions.js';
class SubmitAction extends Action2 {
    run(accessor, ...args) {
        const context = args[0];
        const widgetService = accessor.get(IChatWidgetService);
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        widget?.acceptInput(context?.inputValue);
    }
}
const whenNotInProgressOrPaused = ContextKeyExpr.or(ChatContextKeys.isRequestPaused, ChatContextKeys.requestInProgress.negate());
export class ChatSubmitAction extends SubmitAction {
    static { this.ID = 'workbench.action.chat.submit'; }
    constructor() {
        const precondition = ContextKeyExpr.and(
        // if the input has prompt instructions attached, allow submitting requests even
        // without text present - having instructions is enough context for a request
        ContextKeyExpr.or(ChatContextKeys.inputHasText, ChatContextKeys.instructionsAttached), whenNotInProgressOrPaused, ChatContextKeys.chatMode.isEqualTo(ChatMode.Ask));
        super({
            id: ChatSubmitAction.ID,
            title: localize2('interactive.submit.label', "Send and Dispatch"),
            f1: false,
            category: CHAT_CATEGORY,
            icon: Codicon.send,
            precondition,
            keybinding: {
                when: ChatContextKeys.inChatInput,
                primary: 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menu: [
                {
                    id: MenuId.ChatExecuteSecondary,
                    group: 'group_1',
                    order: 1,
                    when: ChatContextKeys.chatMode.isEqualTo(ChatMode.Ask)
                },
                {
                    id: MenuId.ChatExecute,
                    order: 4,
                    when: ContextKeyExpr.and(whenNotInProgressOrPaused, ChatContextKeys.chatMode.isEqualTo(ChatMode.Ask)),
                    group: 'navigation',
                },
            ]
        });
    }
}
export const ToggleAgentModeActionId = 'workbench.action.chat.toggleAgentMode';
class ToggleChatModeAction extends Action2 {
    static { this.ID = ToggleAgentModeActionId; }
    constructor() {
        super({
            id: ToggleChatModeAction.ID,
            title: localize2('interactive.toggleAgent.label', "Set Chat Mode"),
            f1: true,
            category: CHAT_CATEGORY,
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(ChatContextKeys.Editing.hasToolsAgent, ChatContextKeyExprs.unifiedChatEnabled), ChatContextKeys.requestInProgress.negate()),
            tooltip: localize('setChatMode', "Set Mode"),
            keybinding: {
                when: ContextKeyExpr.and(ChatContextKeys.inChatInput, ChatContextKeyExprs.inEditsOrUnified),
                primary: 2048 /* KeyMod.CtrlCmd */ | 89 /* KeyCode.Period */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menu: [
                {
                    id: MenuId.ChatExecute,
                    order: 1,
                    // Either in edits with agent mode available, or in unified chat view
                    when: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(ContextKeyExpr.and(ChatContextKeys.location.isEqualTo(ChatAgentLocation.EditingSession), ChatContextKeys.Editing.hasToolsAgent), ChatContextKeys.inUnifiedChat)),
                    group: 'navigation',
                },
            ]
        });
    }
    async run(accessor, ...args) {
        const chatService = accessor.get(IChatService);
        const commandService = accessor.get(ICommandService);
        const configurationService = accessor.get(IConfigurationService);
        const dialogService = accessor.get(IDialogService);
        const context = getEditingSessionContext(accessor, args);
        if (!context?.chatWidget) {
            return;
        }
        const arg = args.at(0);
        const chatSession = context.chatWidget.viewModel?.model;
        const requestCount = chatSession?.getRequests().length ?? 0;
        const switchToMode = validateChatMode(arg?.mode) ?? this.getNextMode(context.chatWidget, requestCount, configurationService);
        const needToClearEdits = (!chatService.unifiedViewEnabled || (!configurationService.getValue(ChatConfiguration.Edits2Enabled) && (context.chatWidget.input.currentMode === ChatMode.Edit || switchToMode === ChatMode.Edit))) && requestCount > 0;
        if (switchToMode === context.chatWidget.input.currentMode) {
            return;
        }
        if (needToClearEdits) {
            // If not in unified view, or not using edits2 and switching into or out of edit mode, ask to discard the session
            const phrase = localize('switchMode.confirmPhrase', "Switching chat modes will end your current edit session.");
            if (!context.editingSession) {
                return;
            }
            const currentEdits = context.editingSession.entries.get();
            const undecidedEdits = currentEdits.filter((edit) => edit.state.get() === 0 /* WorkingSetEntryState.Modified */);
            if (undecidedEdits.length > 0) {
                if (!await handleCurrentEditingSession(context.editingSession, phrase, dialogService)) {
                    return;
                }
            }
            else {
                const confirmation = await dialogService.confirm({
                    title: localize('agent.newSession', "Start new session?"),
                    message: localize('agent.newSessionMessage', "Changing the chat mode will end your current edit session. Would you like to continue?"),
                    primaryButton: localize('agent.newSession.confirm', "Yes"),
                    type: 'info'
                });
                if (!confirmation.confirmed) {
                    return;
                }
            }
        }
        context.chatWidget.input.setChatMode(switchToMode);
        if (needToClearEdits) {
            const clearAction = chatService.unifiedViewEnabled ? ACTION_ID_NEW_CHAT : ChatDoneActionId;
            await commandService.executeCommand(clearAction);
        }
    }
    getNextMode(chatWidget, requestCount, configurationService) {
        const modes = [ChatMode.Agent];
        if (configurationService.getValue(ChatConfiguration.Edits2Enabled) || requestCount === 0) {
            modes.push(ChatMode.Edit);
        }
        if (chatWidget.location === ChatAgentLocation.Panel) {
            modes.push(ChatMode.Ask);
        }
        const modeIndex = modes.indexOf(chatWidget.input.currentMode);
        const newMode = modes[(modeIndex + 1) % modes.length];
        return newMode;
    }
}
export const ToggleRequestPausedActionId = 'workbench.action.chat.toggleRequestPaused';
export class ToggleRequestPausedAction extends Action2 {
    static { this.ID = ToggleRequestPausedActionId; }
    constructor() {
        super({
            id: ToggleRequestPausedAction.ID,
            title: localize2('interactive.toggleRequestPausd.label', "Toggle Request Paused"),
            category: CHAT_CATEGORY,
            icon: Codicon.debugPause,
            toggled: {
                condition: ChatContextKeys.isRequestPaused,
                icon: Codicon.play,
                tooltip: localize('requestIsPaused', "Resume Request"),
            },
            tooltip: localize('requestNotPaused', "Pause Request"),
            menu: [
                {
                    id: MenuId.ChatExecute,
                    order: 3.5,
                    when: ContextKeyExpr.and(ChatContextKeys.canRequestBePaused, ChatContextKeys.chatMode.isEqualTo(ChatMode.Agent), ChatContextKeyExprs.inEditsOrUnified, ContextKeyExpr.or(ChatContextKeys.isRequestPaused.negate(), ChatContextKeys.inputHasText.negate())),
                    group: 'navigation',
                },
            ]
        });
    }
    run(accessor, ...args) {
        const context = args[0];
        const widgetService = accessor.get(IChatWidgetService);
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        widget?.togglePaused();
    }
}
export const ChatSwitchToNextModelActionId = 'workbench.action.chat.switchToNextModel';
export class SwitchToNextModelAction extends Action2 {
    static { this.ID = ChatSwitchToNextModelActionId; }
    constructor() {
        super({
            id: SwitchToNextModelAction.ID,
            title: localize2('interactive.switchToNextModel.label', "Switch to Next Model"),
            category: CHAT_CATEGORY,
            f1: true,
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 89 /* KeyCode.Period */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ChatContextKeys.inChatInput
            },
            precondition: ChatContextKeys.enabled,
            menu: {
                id: MenuId.ChatExecute,
                order: 3,
                group: 'navigation',
                when: ContextKeyExpr.and(ChatContextKeys.languageModelsAreUserSelectable, ContextKeyExpr.or(ContextKeyExpr.equals(ChatContextKeys.location.key, ChatAgentLocation.Panel), ContextKeyExpr.equals(ChatContextKeys.location.key, ChatAgentLocation.EditingSession), ContextKeyExpr.equals(ChatContextKeys.location.key, ChatAgentLocation.Editor), ContextKeyExpr.equals(ChatContextKeys.location.key, ChatAgentLocation.Notebook), ContextKeyExpr.equals(ChatContextKeys.location.key, ChatAgentLocation.Terminal))),
            }
        });
    }
    run(accessor, ...args) {
        const widgetService = accessor.get(IChatWidgetService);
        const widget = widgetService.lastFocusedWidget;
        widget?.input.switchToNextModel();
    }
}
export class ChatEditingSessionSubmitAction extends SubmitAction {
    static { this.ID = 'workbench.action.edits.submit'; }
    constructor() {
        const precondition = ContextKeyExpr.and(
        // if the input has prompt instructions attached, allow submitting requests even
        // without text present - having instructions is enough context for a request
        ContextKeyExpr.or(ChatContextKeys.inputHasText, ChatContextKeys.instructionsAttached), whenNotInProgressOrPaused, ChatContextKeys.chatMode.notEqualsTo(ChatMode.Ask));
        super({
            id: ChatEditingSessionSubmitAction.ID,
            title: localize2('edits.submit.label', "Send"),
            f1: false,
            category: CHAT_CATEGORY,
            icon: Codicon.send,
            precondition,
            keybinding: {
                when: ChatContextKeys.inChatInput,
                primary: 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menu: [
                {
                    id: MenuId.ChatExecuteSecondary,
                    group: 'group_1',
                    when: ContextKeyExpr.and(whenNotInProgressOrPaused, ChatContextKeys.chatMode.notEqualsTo(ChatMode.Ask)),
                    order: 1
                },
                {
                    id: MenuId.ChatExecute,
                    order: 4,
                    when: ContextKeyExpr.and(ContextKeyExpr.or(ContextKeyExpr.and(ChatContextKeys.isRequestPaused, ChatContextKeys.inputHasText), ChatContextKeys.requestInProgress.negate()), ChatContextKeys.chatMode.notEqualsTo(ChatMode.Ask)),
                    group: 'navigation',
                },
            ]
        });
    }
}
class SubmitWithoutDispatchingAction extends Action2 {
    static { this.ID = 'workbench.action.chat.submitWithoutDispatching'; }
    constructor() {
        const precondition = ContextKeyExpr.and(
        // if the input has prompt instructions attached, allow submitting requests even
        // without text present - having instructions is enough context for a request
        ContextKeyExpr.or(ChatContextKeys.inputHasText, ChatContextKeys.instructionsAttached), whenNotInProgressOrPaused, ChatContextKeys.chatMode.isEqualTo(ChatMode.Ask));
        super({
            id: SubmitWithoutDispatchingAction.ID,
            title: localize2('interactive.submitWithoutDispatch.label', "Send"),
            f1: false,
            category: CHAT_CATEGORY,
            precondition,
            keybinding: {
                when: ChatContextKeys.inChatInput,
                primary: 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menu: [
                {
                    id: MenuId.ChatExecuteSecondary,
                    group: 'group_1',
                    order: 2,
                    when: ChatContextKeys.chatMode.isEqualTo(ChatMode.Ask),
                }
            ]
        });
    }
    run(accessor, ...args) {
        const context = args[0];
        const widgetService = accessor.get(IChatWidgetService);
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        widget?.acceptInput(context?.inputValue, { noCommandDetection: true });
    }
}
export class ChatSubmitWithCodebaseAction extends Action2 {
    static { this.ID = 'workbench.action.chat.submitWithCodebase'; }
    constructor() {
        const precondition = ContextKeyExpr.and(
        // if the input has prompt instructions attached, allow submitting requests even
        // without text present - having instructions is enough context for a request
        ContextKeyExpr.or(ChatContextKeys.inputHasText, ChatContextKeys.instructionsAttached), whenNotInProgressOrPaused);
        super({
            id: ChatSubmitWithCodebaseAction.ID,
            title: localize2('actions.chat.submitWithCodebase', "Send with {0}", `${chatVariableLeader}codebase`),
            precondition,
            menu: {
                id: MenuId.ChatExecuteSecondary,
                group: 'group_1',
                order: 3,
                when: ContextKeyExpr.equals(ChatContextKeys.location.key, ChatAgentLocation.Panel),
            },
            keybinding: {
                when: ChatContextKeys.inChatInput,
                primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
        });
    }
    run(accessor, ...args) {
        const context = args[0];
        const widgetService = accessor.get(IChatWidgetService);
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        if (!widget) {
            return;
        }
        const languageModelToolsService = accessor.get(ILanguageModelToolsService);
        const codebaseTool = languageModelToolsService.getToolByName('codebase');
        if (!codebaseTool) {
            return;
        }
        widget.input.attachmentModel.addContext({
            id: codebaseTool.id,
            name: codebaseTool.displayName ?? '',
            fullName: codebaseTool.displayName ?? '',
            value: undefined,
            icon: ThemeIcon.isThemeIcon(codebaseTool.icon) ? codebaseTool.icon : undefined,
            isTool: true
        });
        widget.acceptInput();
    }
}
class SendToChatEditingAction extends Action2 {
    constructor() {
        const precondition = ContextKeyExpr.and(
        // if the input has prompt instructions attached, allow submitting requests even
        // without text present - having instructions is enough context for a request
        ContextKeyExpr.or(ChatContextKeys.inputHasText, ChatContextKeys.instructionsAttached), ChatContextKeys.inputHasAgent.negate(), whenNotInProgressOrPaused, ChatContextKeyExprs.inNonUnifiedPanel);
        super({
            id: 'workbench.action.chat.sendToChatEditing',
            title: localize2('chat.sendToChatEditing.label', "Send to Copilot Edits"),
            precondition,
            category: CHAT_CATEGORY,
            f1: false,
            menu: {
                id: MenuId.ChatExecuteSecondary,
                group: 'group_1',
                order: 4,
                when: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.editingParticipantRegistered, ChatContextKeys.location.notEqualsTo(ChatAgentLocation.EditingSession), ChatContextKeys.location.notEqualsTo(ChatAgentLocation.Editor), ChatContextKeyExprs.inNonUnifiedPanel)
            },
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */,
                when: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.editingParticipantRegistered, ChatContextKeys.location.notEqualsTo(ChatAgentLocation.EditingSession), ChatContextKeys.location.notEqualsTo(ChatAgentLocation.Editor))
            }
        });
    }
    async run(accessor, ...args) {
        if (!accessor.get(IChatAgentService).getDefaultAgent(ChatAgentLocation.EditingSession)) {
            return;
        }
        const widget = args.length > 0 && args[0].widget ? args[0].widget : accessor.get(IChatWidgetService).lastFocusedWidget;
        const viewsService = accessor.get(IViewsService);
        const dialogService = accessor.get(IDialogService);
        const { widget: editingWidget } = await viewsService.openView(EditsViewId);
        if (!editingWidget.viewModel?.sessionId) {
            return;
        }
        const currentEditingSession = editingWidget.viewModel.model.editingSession;
        if (!currentEditingSession) {
            return;
        }
        const currentEditCount = currentEditingSession?.entries.get().length;
        if (currentEditCount) {
            const result = await dialogService.confirm({
                title: localize('chat.startEditing.confirmation.title', "Start new editing session?"),
                message: currentEditCount === 1
                    ? localize('chat.startEditing.confirmation.message.one', "Starting a new editing session will end your current editing session containing {0} file. Do you wish to proceed?", currentEditCount)
                    : localize('chat.startEditing.confirmation.message.many', "Starting a new editing session will end your current editing session containing {0} files. Do you wish to proceed?", currentEditCount),
                type: 'info',
                primaryButton: localize('chat.startEditing.confirmation.primaryButton', "Yes")
            });
            if (!result.confirmed) {
                return;
            }
            await currentEditingSession.stop(true);
            editingWidget.clear();
        }
        for (const attachment of widget.attachmentModel.attachments) {
            editingWidget.attachmentModel.addContext(attachment);
        }
        editingWidget.setInput(widget.getInput());
        widget.setInput('');
        widget.attachmentModel.clear();
        editingWidget.acceptInput();
        editingWidget.focusInput();
    }
}
class SendToNewChatAction extends Action2 {
    constructor() {
        const precondition = ContextKeyExpr.and(
        // if the input has prompt instructions attached, allow submitting requests even
        // without text present - having instructions is enough context for a request
        ContextKeyExpr.or(ChatContextKeys.inputHasText, ChatContextKeys.instructionsAttached), whenNotInProgressOrPaused);
        super({
            id: 'workbench.action.chat.sendToNewChat',
            title: localize2('chat.newChat.label', "Send to New Chat"),
            precondition,
            category: CHAT_CATEGORY,
            f1: false,
            menu: {
                id: MenuId.ChatExecuteSecondary,
                group: 'group_2',
                when: ContextKeyExpr.equals(ChatContextKeys.location.key, ChatAgentLocation.Panel)
            },
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
                when: ChatContextKeys.inChatInput,
            }
        });
    }
    async run(accessor, ...args) {
        const context = args[0];
        const widgetService = accessor.get(IChatWidgetService);
        const chatService = accessor.get(IChatService);
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        if (!widget) {
            return;
        }
        widget.clear();
        if (widget.viewModel) {
            await waitForChatSessionCleared(widget.viewModel.sessionId, chatService);
        }
        widget.acceptInput(context?.inputValue);
    }
}
export const CancelChatActionId = 'workbench.action.chat.cancel';
export class CancelAction extends Action2 {
    static { this.ID = CancelChatActionId; }
    constructor() {
        super({
            id: CancelAction.ID,
            title: localize2('interactive.cancel.label', "Cancel"),
            f1: false,
            category: CHAT_CATEGORY,
            icon: Codicon.stopCircle,
            menu: {
                id: MenuId.ChatExecute,
                when: ContextKeyExpr.and(ChatContextKeys.isRequestPaused.negate(), ChatContextKeys.requestInProgress),
                order: 4,
                group: 'navigation',
            },
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 9 /* KeyCode.Escape */,
                win: { primary: 512 /* KeyMod.Alt */ | 1 /* KeyCode.Backspace */ },
            }
        });
    }
    run(accessor, ...args) {
        const context = args[0];
        const widgetService = accessor.get(IChatWidgetService);
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        if (!widget) {
            return;
        }
        const chatService = accessor.get(IChatService);
        if (widget.viewModel) {
            chatService.cancelCurrentRequestForSession(widget.viewModel.sessionId);
        }
    }
}
export function registerChatExecuteActions() {
    registerAction2(ChatSubmitAction);
    registerAction2(ChatEditingSessionSubmitAction);
    registerAction2(SubmitWithoutDispatchingAction);
    registerAction2(CancelAction);
    registerAction2(SendToNewChatAction);
    registerAction2(ChatSubmitWithCodebaseAction);
    registerAction2(SendToChatEditingAction);
    registerAction2(ToggleChatModeAction);
    registerAction2(ToggleRequestPausedAction);
    registerAction2(SwitchToNextModelAction);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEV4ZWN1dGVBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRFeGVjdXRlQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFakUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRXBFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDckcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFbkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUV2RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixFQUFFLFFBQVEsRUFBRSxnQkFB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