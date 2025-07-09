/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerEditorContribution } from '../../../../editor/browser/editorExtensions.js';
import { MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { InlineChatController, InlineChatController1, InlineChatController2 } from './inlineChatController.js';
import * as InlineChatActions from './inlineChatActions.js';
import { CTX_INLINE_CHAT_EDITING, CTX_INLINE_CHAT_REQUEST_IN_PROGRESS, INLINE_CHAT_ID, MENU_INLINE_CHAT_WIDGET_STATUS } from '../common/inlineChat.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { InlineChatNotebookContribution } from './inlineChatNotebook.js';
import { registerWorkbenchContribution2, Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { InlineChatAccessibleView } from './inlineChatAccessibleView.js';
import { IInlineChatSessionService } from './inlineChatSessionService.js';
import { InlineChatEnabler, InlineChatSessionServiceImpl } from './inlineChatSessionServiceImpl.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { CancelAction, ChatSubmitAction } from '../../chat/browser/actions/chatExecuteActions.js';
import { localize } from '../../../../nls.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { InlineChatAccessibilityHelp } from './inlineChatAccessibilityHelp.js';
import { InlineChatExpandLineAction, InlineChatHintsController, HideInlineChatHintAction, ShowInlineChatHintAction } from './inlineChatCurrentLine.js';
registerEditorContribution(InlineChatController2.ID, InlineChatController2, 0 /* EditorContributionInstantiation.Eager */); // EAGER because of notebook dispose/create of editors
registerEditorContribution(INLINE_CHAT_ID, InlineChatController1, 0 /* EditorContributionInstantiation.Eager */); // EAGER because of notebook dispose/create of editors
registerEditorContribution(InlineChatController.ID, InlineChatController, 0 /* EditorContributionInstantiation.Eager */); // EAGER because of notebook dispose/create of editors
registerAction2(InlineChatActions.StopSessionAction2);
registerAction2(InlineChatActions.RevealWidget);
// --- browser
registerSingleton(IInlineChatSessionService, InlineChatSessionServiceImpl, 1 /* InstantiationType.Delayed */);
registerAction2(InlineChatExpandLineAction);
registerAction2(ShowInlineChatHintAction);
registerAction2(HideInlineChatHintAction);
registerEditorContribution(InlineChatHintsController.ID, InlineChatHintsController, 3 /* EditorContributionInstantiation.Eventually */);
// --- MENU special ---
const editActionMenuItem = {
    group: '0_main',
    order: 0,
    command: {
        id: ChatSubmitAction.ID,
        title: localize('send.edit', "Edit Code"),
    },
    when: ContextKeyExpr.and(ChatContextKeys.inputHasText, CTX_INLINE_CHAT_REQUEST_IN_PROGRESS.toNegated(), CTX_INLINE_CHAT_EDITING),
};
const generateActionMenuItem = {
    group: '0_main',
    order: 0,
    command: {
        id: ChatSubmitAction.ID,
        title: localize('send.generate', "Generate"),
    },
    when: ContextKeyExpr.and(ChatContextKeys.inputHasText, CTX_INLINE_CHAT_REQUEST_IN_PROGRESS.toNegated(), CTX_INLINE_CHAT_EDITING.toNegated()),
};
MenuRegistry.appendMenuItem(MENU_INLINE_CHAT_WIDGET_STATUS, editActionMenuItem);
MenuRegistry.appendMenuItem(MENU_INLINE_CHAT_WIDGET_STATUS, generateActionMenuItem);
const cancelActionMenuItem = {
    group: '0_main',
    order: 0,
    command: {
        id: CancelAction.ID,
        title: localize('cancel', "Cancel Request"),
        shortTitle: localize('cancelShort', "Cancel"),
    },
    when: ContextKeyExpr.and(CTX_INLINE_CHAT_REQUEST_IN_PROGRESS),
};
MenuRegistry.appendMenuItem(MENU_INLINE_CHAT_WIDGET_STATUS, cancelActionMenuItem);
// --- actions ---
registerAction2(InlineChatActions.StartSessionAction);
registerAction2(InlineChatActions.CloseAction);
registerAction2(InlineChatActions.ConfigureInlineChatAction);
registerAction2(InlineChatActions.UnstashSessionAction);
registerAction2(InlineChatActions.DiscardHunkAction);
registerAction2(InlineChatActions.RerunAction);
registerAction2(InlineChatActions.MoveToNextHunk);
registerAction2(InlineChatActions.MoveToPreviousHunk);
registerAction2(InlineChatActions.ArrowOutUpAction);
registerAction2(InlineChatActions.ArrowOutDownAction);
registerAction2(InlineChatActions.FocusInlineChat);
registerAction2(InlineChatActions.ViewInChatAction);
registerAction2(InlineChatActions.ToggleDiffForChange);
registerAction2(InlineChatActions.AcceptChanges);
const workbenchContributionsRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchContributionsRegistry.registerWorkbenchContribution(InlineChatNotebookContribution, 3 /* LifecyclePhase.Restored */);
registerWorkbenchContribution2(InlineChatEnabler.Id, InlineChatEnabler, 3 /* WorkbenchPhase.AfterRestored */);
AccessibleViewRegistry.register(new InlineChatAccessibleView());
AccessibleViewRegistry.register(new InlineChatAccessibilityHelp());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaW5saW5lQ2hhdC9icm93c2VyL2lubGluZUNoYXQuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBbUMsMEJBQTBCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUM3SCxPQUFPLEVBQWEsWUFBWSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxxQkFBcUIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQy9HLE9BQU8sS0FBSyxpQkFBaUIsTUFBTSx3QkFBd0IsQ0FBQztBQUM1RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsbUNBQW1DLEVBQUUsY0FBYyxFQUFFLDhCQUE4QixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdkosT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUU1RSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN6RSxPQUFPLEVBQW1DLDhCQUE4QixFQUFFLFVBQVUsSUFBSSxtQkFBbUIsRUFBa0IsTUFBTSxrQ0FBa0MsQ0FBQztBQUN0SyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN6RSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMxRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRyxPQUFPLEVBQUUs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