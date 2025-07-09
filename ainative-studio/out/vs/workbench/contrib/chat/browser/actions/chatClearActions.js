/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { raceTimeout } from '../../../../../base/common/async.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Event } from '../../../../../base/common/event.js';
import { localize2 } from '../../../../../nls.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { ActiveEditorContext } from '../../../../common/contextkeys.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { isChatViewTitleActionContext } from '../../common/chatActions.js';
import { ChatContextKeyExprs, ChatContextKeys } from '../../common/chatContextKeys.js';
import { hasAppliedChatEditsContextKey, hasUndecidedChatEditingResourceContextKey } from '../../common/chatEditingService.js';
import { IChatService } from '../../common/chatService.js';
import { ChatAgentLocation, ChatMode } from '../../common/constants.js';
import { ChatViewId, EditsViewId, IChatWidgetService } from '../chat.js';
import { EditingSessionAction } from '../chatEditing/chatEditingActions.js';
import { ctxIsGlobalEditingSession } from '../chatEditing/chatEditingEditorContextKeys.js';
import { ChatEditorInput } from '../chatEditorInput.js';
import { CHAT_CATEGORY, handleCurrentEditingSession } from './chatActions.js';
import { clearChatEditor } from './chatClear.js';
export const ACTION_ID_NEW_CHAT = `workbench.action.chat.newChat`;
export const ACTION_ID_NEW_EDIT_SESSION = `workbench.action.chat.newEditSession`;
export const ChatDoneActionId = 'workbench.action.chat.done';
export function registerNewChatActions() {
    registerAction2(class NewChatEditorAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chatEditor.newChat',
                title: localize2('chat.newChat.label', "New Chat"),
                icon: Codicon.plus,
                f1: false,
                precondition: ChatContextKeys.enabled,
                menu: [{
                        id: MenuId.EditorTitle,
                        group: 'navigation',
                        order: 0,
                        when: ActiveEditorContext.isEqualTo(ChatEditorInput.EditorID),
                    }]
            });
        }
        async run(accessor, ...args) {
            announceChatCleared(accessor.get(IAccessibilitySignalService));
            await clearChatEditor(accessor);
        }
    });
    registerAction2(class GlobalClearChatAction extends Action2 {
        constructor() {
            super({
                id: ACTION_ID_NEW_CHAT,
                title: localize2('chat.newChat.label', "New Chat"),
                category: CHAT_CATEGORY,
                icon: Codicon.plus,
                precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.location.notEqualsTo(ChatAgentLocation.EditingSession), ChatContextKeyExprs.unifiedChatEnabled.negate()),
                f1: true,
                keybinding: {
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 42 /* KeyCode.KeyL */,
                    mac: {
                        primary: 256 /* KeyMod.WinCtrl */ | 42 /* KeyCode.KeyL */
                    },
                    when: ChatContextKeys.inChatSession
                },
                menu: [{
                        id: MenuId.ChatContext,
                        group: 'z_clear',
                        when: ContextKeyExpr.and(ChatContextKeys.location.isEqualTo(ChatAgentLocation.Panel), ChatContextKeys.inUnifiedChat.negate()),
                    },
                    {
                        id: MenuId.ViewTitle,
                        when: ContextKeyExpr.and(ChatContextKeys.location.isEqualTo(ChatAgentLocation.Panel), ChatContextKeys.inUnifiedChat.negate()),
                        group: 'navigation',
                        order: -1
                    }]
            });
        }
        async run(accessor, ...args) {
            const context = args[0];
            const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
            const widgetService = accessor.get(IChatWidgetService);
            let widget = widgetService.lastFocusedWidget;
            if (isChatViewTitleActionContext(context)) {
                // Is running in the Chat view title
                widget = widgetService.getWidgetBySessionId(context.sessionId);
            }
            if (widget) {
                announceChatCleared(accessibilitySignalService);
                widget.clear();
                widget.focusInput();
            }
        }
    });
    registerAction2(class NewEditSessionAction extends EditingSessionAction {
        constructor() {
            super({
                id: ACTION_ID_NEW_EDIT_SESSION,
                title: localize2('chat.newEdits.label', "New Chat"),
                category: CHAT_CATEGORY,
                icon: Codicon.plus,
                precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.editingParticipantRegistered),
                f1: true,
                menu: [{
                        id: MenuId.ChatContext,
                        group: 'z_clear'
                    },
                    {
                        id: MenuId.ViewTitle,
                        when: ChatContextKeyExprs.inEditsOrUnified,
                        group: 'navigation',
                        order: -1
                    }],
                keybinding: {
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 42 /* KeyCode.KeyL */,
                    mac: {
                        primary: 256 /* KeyMod.WinCtrl */ | 42 /* KeyCode.KeyL */
                    },
                    when: ChatContextKeys.inChatSession
                }
            });
        }
        async runEditingSessionAction(accessor, editingSession, widget, ...args) {
            const context = args[0];
            const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
            const dialogService = accessor.get(IDialogService);
            const chatService = accessor.get(IChatService);
            if (!(await handleCurrentEditingSession(editingSession, undefined, dialogService))) {
                return;
            }
            announceChatCleared(accessibilitySignalService);
            await editingSession.stop();
            widget.clear();
            await waitForChatSessionCleared(editingSession.chatSessionId, chatService);
            widget.attachmentModel.clear();
            widget.input.relatedFiles?.clear();
            widget.focusInput();
            if (!context) {
                return;
            }
            if (typeof context.agentMode === 'boolean') {
                widget.input.setChatMode(context.agentMode ? ChatMode.Agent : ChatMode.Edit);
            }
            if (context.inputValue) {
                if (context.isPartialQuery) {
                    widget.setInput(context.inputValue);
                }
                else {
                    widget.acceptInput(context.inputValue);
                }
            }
        }
    });
    registerAction2(class GlobalEditsDoneAction extends EditingSessionAction {
        constructor() {
            super({
                id: ChatDoneActionId,
                title: localize2('chat.done.label', "Done"),
                category: CHAT_CATEGORY,
                precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.editingParticipantRegistered),
                f1: false,
                menu: [{
                        id: MenuId.ChatEditingWidgetToolbar,
                        when: ContextKeyExpr.and(hasUndecidedChatEditingResourceContextKey.negate(), hasAppliedChatEditsContextKey, ChatContextKeys.editingParticipantRegistered, ChatContextKeyExprs.inEditsOrUnified),
                        group: 'navigation',
                        order: 0
                    }]
            });
        }
        async runEditingSessionAction(accessor, editingSession, widget, ...args) {
            const context = args[0];
            const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
            if (isChatViewTitleActionContext(context)) {
                // Is running in the Chat view title
                announceChatCleared(accessibilitySignalService);
                if (widget) {
                    widget.clear();
                    widget.attachmentModel.clear();
                    widget.focusInput();
                }
            }
            else {
                // Is running from f1 or keybinding
                announceChatCleared(accessibilitySignalService);
                widget.clear();
                widget.attachmentModel.clear();
                widget.focusInput();
            }
        }
    });
    registerAction2(class UndoChatEditInteractionAction extends EditingSessionAction {
        constructor() {
            super({
                id: 'workbench.action.chat.undoEdit',
                title: localize2('chat.undoEdit.label', "Undo Last Request"),
                category: CHAT_CATEGORY,
                icon: Codicon.discard,
                precondition: ContextKeyExpr.and(ChatContextKeys.chatEditingCanUndo, ChatContextKeys.enabled, ChatContextKeys.editingParticipantRegistered),
                f1: true,
                menu: [{
                        id: MenuId.ViewTitle,
                        when: ChatContextKeyExprs.inEditsOrUnified,
                        group: 'navigation',
                        order: -3
                    }]
            });
        }
        async runEditingSessionAction(accessor, editingSession) {
            await editingSession.undoInteraction();
        }
    });
    registerAction2(class RedoChatEditInteractionAction extends EditingSessionAction {
        constructor() {
            super({
                id: 'workbench.action.chat.redoEdit',
                title: localize2('chat.redoEdit.label', "Redo Last Request"),
                category: CHAT_CATEGORY,
                icon: Codicon.redo,
                precondition: ContextKeyExpr.and(ChatContextKeys.chatEditingCanRedo, ChatContextKeys.enabled, ChatContextKeys.editingParticipantRegistered),
                f1: true,
                menu: [{
                        id: MenuId.ViewTitle,
                        when: ChatContextKeyExprs.inEditsOrUnified,
                        group: 'navigation',
                        order: -2
                    }]
            });
        }
        async runEditingSessionAction(accessor, editingSession) {
            await editingSession.redoInteraction();
        }
    });
    registerAction2(class GlobalOpenEditsAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.openEditSession',
                title: localize2('chat.openEdits.label', "Open {0}", 'Copilot Edits'),
                category: CHAT_CATEGORY,
                icon: Codicon.goToEditingSession,
                f1: true,
                precondition: ChatContextKeys.Setup.hidden.toNegated(),
                menu: [{
                        id: MenuId.ViewTitle,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', ChatViewId), ChatContextKeys.editingParticipantRegistered, ContextKeyExpr.equals(`view.${EditsViewId}.visible`, false), ContextKeyExpr.or(ContextKeyExpr.and(ContextKeyExpr.equals(`workbench.panel.chat.defaultViewContainerLocation`, true), ContextKeyExpr.equals(`workbench.panel.chatEditing.defaultViewContainerLocation`, false)), ContextKeyExpr.and(ContextKeyExpr.equals(`workbench.panel.chat.defaultViewContainerLocation`, false), ContextKeyExpr.equals(`workbench.panel.chatEditing.defaultViewContainerLocation`, true))), ChatContextKeys.inUnifiedChat.negate()),
                        group: 'navigation',
                        order: 1
                    }, {
                        id: MenuId.ChatTitleBarMenu,
                        group: 'a_open',
                        order: 2,
                        when: ChatContextKeyExprs.unifiedChatEnabled.negate()
                    }, {
                        id: MenuId.ChatEditingEditorContent,
                        when: ctxIsGlobalEditingSession,
                        group: 'navigate',
                        order: 4,
                    }],
                keybinding: {
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 39 /* KeyCode.KeyI */,
                    linux: {
                        primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 39 /* KeyCode.KeyI */
                    },
                    when: ContextKeyExpr.and(ContextKeyExpr.notEquals('view', EditsViewId), ChatContextKeys.editingParticipantRegistered)
                }
            });
        }
        async run(accessor, opts) {
            opts = typeof opts === 'string' ? { query: opts } : opts;
            const viewsService = accessor.get(IViewsService);
            const chatView = await viewsService.openView(EditsViewId)
                ?? await viewsService.openView(ChatViewId);
            if (!chatView?.widget) {
                return;
            }
            if (!chatView.widget.viewModel) {
                await Event.toPromise(Event.filter(chatView.widget.onDidChangeViewModel, () => !!chatView.widget.viewModel));
            }
            if (opts?.query) {
                if (opts.isPartialQuery) {
                    chatView.widget.setInput(opts.query);
                }
                else {
                    chatView.widget.acceptInput(opts.query);
                }
            }
            chatView.widget.focusInput();
        }
    });
}
function announceChatCleared(accessibilitySignalService) {
    accessibilitySignalService.playSignal(AccessibilitySignal.clear);
}
export async function waitForChatSessionCleared(sessionId, chatService) {
    if (!chatService.getSession(sessionId)) {
        return;
    }
    // The ChatWidget just signals cancellation to its host viewpane or editor. Clearing the session is now async, we need to wait for it to finish.
    // This is expected to always happen.
    await raceTimeout(Event.toPromise(Event.filter(chatService.onDidDisposeSession, e => e.sessionId === sessionId)), 2000);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENsZWFyQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0Q2xlYXJBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRzVELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxtRkFBbUYsQ0FBQztBQUNySixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNyRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDekYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRW5GLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdkYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLHlDQUF5QyxFQUF1QixNQUFNLG9DQUFvQyxDQUFDO0FBQ25KLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FB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