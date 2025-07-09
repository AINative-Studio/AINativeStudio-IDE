/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { localize2 } from '../../../../../nls.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IChatWidgetService } from '../../../chat/browser/chat.js';
import { ChatContextKeys } from '../../../chat/common/chatContextKeys.js';
import { IChatService } from '../../../chat/common/chatService.js';
import { ChatAgentLocation } from '../../../chat/common/constants.js';
import { AbstractInline1ChatAction } from '../../../inlineChat/browser/inlineChatActions.js';
import { isDetachedTerminalInstance } from '../../../terminal/browser/terminal.js';
import { registerActiveXtermAction } from '../../../terminal/browser/terminalActions.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import { MENU_TERMINAL_CHAT_WIDGET_STATUS, TerminalChatContextKeys } from './terminalChat.js';
import { TerminalChatController } from './terminalChatController.js';
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.start" /* TerminalChatCommandId.Start */,
    title: localize2('startChat', 'Terminal Inline Chat'),
    category: AbstractInline1ChatAction.category,
    keybinding: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */,
        when: ContextKeyExpr.and(TerminalContextKeys.focusInAny),
        // HACK: Force weight to be higher than the extension contributed keybinding to override it until it gets replaced
        weight: 400 /* KeybindingWeight.ExternalExtension */ + 1, // KeybindingWeight.WorkbenchContrib,
    },
    f1: true,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.hasChatAgent),
    run: (_xterm, _accessor, activeInstance, opts) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        if (opts) {
            opts = typeof opts === 'string' ? { query: opts } : opts;
            if (typeof opts === 'object' && opts !== null && 'query' in opts && typeof opts.query === 'string') {
                contr?.updateInput(opts.query, false);
                if (!('isPartialQuery' in opts && opts.isPartialQuery)) {
                    contr?.terminalChatWidget?.acceptInput();
                }
            }
        }
        contr?.terminalChatWidget?.reveal();
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.close" /* TerminalChatCommandId.Close */,
    title: localize2('closeChat', 'Close'),
    category: AbstractInline1ChatAction.category,
    keybinding: {
        primary: 9 /* KeyCode.Escape */,
        when: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.focus, TerminalChatContextKeys.focused), TerminalChatContextKeys.visible),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    },
    menu: [{
            id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
            group: '0_main',
            order: 2,
        }],
    icon: Codicon.close,
    f1: true,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, TerminalChatContextKeys.visible),
    run: (_xterm, _accessor, activeInstance) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        contr?.terminalChatWidget?.clear();
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.runCommand" /* TerminalChatCommandId.RunCommand */,
    title: localize2('runCommand', 'Run Chat Command'),
    shortTitle: localize2('run', 'Run'),
    category: AbstractInline1ChatAction.category,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.requestActive.negate(), TerminalChatContextKeys.responseContainsCodeBlock, TerminalChatContextKeys.responseContainsMultipleCodeBlocks.negate()),
    icon: Codicon.play,
    keybinding: {
        when: TerminalChatContextKeys.requestActive.negate(),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
    },
    menu: {
        id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
        group: '0_main',
        order: 0,
        when: ContextKeyExpr.and(TerminalChatContextKeys.responseContainsCodeBlock, TerminalChatContextKeys.responseContainsMultipleCodeBlocks.negate(), TerminalChatContextKeys.requestActive.negate())
    },
    run: (_xterm, _accessor, activeInstance) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        contr?.terminalChatWidget?.acceptCommand(true);
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.runFirstCommand" /* TerminalChatCommandId.RunFirstCommand */,
    title: localize2('runFirstCommand', 'Run First Chat Command'),
    shortTitle: localize2('runFirst', 'Run First'),
    category: AbstractInline1ChatAction.category,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.requestActive.negate(), TerminalChatContextKeys.responseContainsMultipleCodeBlocks),
    icon: Codicon.play,
    keybinding: {
        when: TerminalChatContextKeys.requestActive.negate(),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
    },
    menu: {
        id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
        group: '0_main',
        order: 0,
        when: ContextKeyExpr.and(TerminalChatContextKeys.responseContainsMultipleCodeBlocks, TerminalChatContextKeys.requestActive.negate())
    },
    run: (_xterm, _accessor, activeInstance) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        contr?.terminalChatWidget?.acceptCommand(true);
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.insertCommand" /* TerminalChatCommandId.InsertCommand */,
    title: localize2('insertCommand', 'Insert Chat Command'),
    shortTitle: localize2('insert', 'Insert'),
    category: AbstractInline1ChatAction.category,
    icon: Codicon.insert,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.requestActive.negate(), TerminalChatContextKeys.responseContainsCodeBlock, TerminalChatContextKeys.responseContainsMultipleCodeBlocks.negate()),
    keybinding: {
        when: TerminalChatContextKeys.requestActive.negate(),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */ | 512 /* KeyMod.Alt */]
    },
    menu: {
        id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
        group: '0_main',
        order: 1,
        when: ContextKeyExpr.and(TerminalChatContextKeys.responseContainsCodeBlock, TerminalChatContextKeys.responseContainsMultipleCodeBlocks.negate(), TerminalChatContextKeys.requestActive.negate())
    },
    run: (_xterm, _accessor, activeInstance) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        contr?.terminalChatWidget?.acceptCommand(false);
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.insertFirstCommand" /* TerminalChatCommandId.InsertFirstCommand */,
    title: localize2('insertFirstCommand', 'Insert First Chat Command'),
    shortTitle: localize2('insertFirst', 'Insert First'),
    category: AbstractInline1ChatAction.category,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.requestActive.negate(), TerminalChatContextKeys.responseContainsMultipleCodeBlocks),
    keybinding: {
        when: TerminalChatContextKeys.requestActive.negate(),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */ | 512 /* KeyMod.Alt */]
    },
    menu: {
        id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
        group: '0_main',
        order: 1,
        when: ContextKeyExpr.and(TerminalChatContextKeys.responseContainsMultipleCodeBlocks, TerminalChatContextKeys.requestActive.negate())
    },
    run: (_xterm, _accessor, activeInstance) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        contr?.terminalChatWidget?.acceptCommand(false);
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.rerunRequest" /* TerminalChatCommandId.RerunRequest */,
    title: localize2('chat.rerun.label', "Rerun Request"),
    f1: false,
    icon: Codicon.refresh,
    category: AbstractInline1ChatAction.category,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.requestActive.negate()),
    keybinding: {
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 48 /* KeyCode.KeyR */,
        when: TerminalChatContextKeys.focused
    },
    menu: {
        id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
        group: '0_main',
        order: 5,
        when: ContextKeyExpr.and(TerminalChatContextKeys.inputHasText.toNegated(), TerminalChatContextKeys.requestActive.negate())
    },
    run: async (_xterm, _accessor, activeInstance) => {
        const chatService = _accessor.get(IChatService);
        const chatWidgetService = _accessor.get(IChatWidgetService);
        const contr = TerminalChatController.activeChatController;
        const model = contr?.terminalChatWidget?.inlineChatWidget.chatWidget.viewModel?.model;
        if (!model) {
            return;
        }
        const lastRequest = model.getRequests().at(-1);
        if (lastRequest) {
            const widget = chatWidgetService.getWidgetBySessionId(model.sessionId);
            await chatService.resendRequest(lastRequest, {
                noCommandDetection: false,
                attempt: lastRequest.attempt + 1,
                location: ChatAgentLocation.Terminal,
                userSelectedModelId: widget?.input.currentLanguageModel
            });
        }
    }
});
registerActiveXtermAction({
    id: "workbench.action.terminal.chat.viewInChat" /* TerminalChatCommandId.ViewInChat */,
    title: localize2('viewInChat', 'View in Chat'),
    category: AbstractInline1ChatAction.category,
    precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalChatContextKeys.requestActive.negate()),
    icon: Codicon.commentDiscussion,
    menu: [{
            id: MENU_TERMINAL_CHAT_WIDGET_STATUS,
            group: 'zzz',
            order: 1,
            isHiddenByDefault: true,
            when: ContextKeyExpr.and(TerminalChatContextKeys.responseContainsCodeBlock, TerminalChatContextKeys.requestActive.negate()),
        }],
    run: (_xterm, _accessor, activeInstance) => {
        if (isDetachedTerminalInstance(activeInstance)) {
            return;
        }
        const contr = TerminalChatController.activeChatController || TerminalChatController.get(activeInstance);
        contr?.viewInChat();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDaGF0QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdC9icm93c2VyL3Rlcm1pbmFsQ2hhdEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFFekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDbkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM3RixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNuRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN6RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNyRixPQUFPLEVBQUUsZ0NBQWdDLEVBQXlCLHVCQUF1QixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDckgsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFckUseUJBQXlCLENBQUM7SUFDekIsRUFBRSwwRUFBNkI7SUFDL0IsS0FBSyxFQUFFLFNBQVMsQ0FBQyxX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