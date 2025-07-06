/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { RawContextKey } from '../../../../../platform/contextkey/common/contextkey.js';
export var TerminalChatCommandId;
(function (TerminalChatCommandId) {
    TerminalChatCommandId["Start"] = "workbench.action.terminal.chat.start";
    TerminalChatCommandId["Close"] = "workbench.action.terminal.chat.close";
    TerminalChatCommandId["MakeRequest"] = "workbench.action.terminal.chat.makeRequest";
    TerminalChatCommandId["Cancel"] = "workbench.action.terminal.chat.cancel";
    TerminalChatCommandId["RunCommand"] = "workbench.action.terminal.chat.runCommand";
    TerminalChatCommandId["RunFirstCommand"] = "workbench.action.terminal.chat.runFirstCommand";
    TerminalChatCommandId["InsertCommand"] = "workbench.action.terminal.chat.insertCommand";
    TerminalChatCommandId["InsertFirstCommand"] = "workbench.action.terminal.chat.insertFirstCommand";
    TerminalChatCommandId["ViewInChat"] = "workbench.action.terminal.chat.viewInChat";
    TerminalChatCommandId["RerunRequest"] = "workbench.action.terminal.chat.rerunRequest";
})(TerminalChatCommandId || (TerminalChatCommandId = {}));
export const MENU_TERMINAL_CHAT_WIDGET_INPUT_SIDE_TOOLBAR = MenuId.for('terminalChatWidget');
export const MENU_TERMINAL_CHAT_WIDGET_STATUS = MenuId.for('terminalChatWidget.status');
export const MENU_TERMINAL_CHAT_WIDGET_TOOLBAR = MenuId.for('terminalChatWidget.toolbar');
export var TerminalChatContextKeyStrings;
(function (TerminalChatContextKeyStrings) {
    TerminalChatContextKeyStrings["ChatFocus"] = "terminalChatFocus";
    TerminalChatContextKeyStrings["ChatVisible"] = "terminalChatVisible";
    TerminalChatContextKeyStrings["ChatActiveRequest"] = "terminalChatActiveRequest";
    TerminalChatContextKeyStrings["ChatInputHasText"] = "terminalChatInputHasText";
    TerminalChatContextKeyStrings["ChatAgentRegistered"] = "terminalChatAgentRegistered";
    TerminalChatContextKeyStrings["ChatResponseEditorFocused"] = "terminalChatResponseEditorFocused";
    TerminalChatContextKeyStrings["ChatResponseContainsCodeBlock"] = "terminalChatResponseContainsCodeBlock";
    TerminalChatContextKeyStrings["ChatResponseContainsMultipleCodeBlocks"] = "terminalChatResponseContainsMultipleCodeBlocks";
    TerminalChatContextKeyStrings["ChatResponseSupportsIssueReporting"] = "terminalChatResponseSupportsIssueReporting";
    TerminalChatContextKeyStrings["ChatSessionResponseVote"] = "terminalChatSessionResponseVote";
})(TerminalChatContextKeyStrings || (TerminalChatContextKeyStrings = {}));
export var TerminalChatContextKeys;
(function (TerminalChatContextKeys) {
    /** Whether the chat widget is focused */
    TerminalChatContextKeys.focused = new RawContextKey("terminalChatFocus" /* TerminalChatContextKeyStrings.ChatFocus */, false, localize('chatFocusedContextKey', "Whether the chat view is focused."));
    /** Whether the chat widget is visible */
    TerminalChatContextKeys.visible = new RawContextKey("terminalChatVisible" /* TerminalChatContextKeyStrings.ChatVisible */, false, localize('chatVisibleContextKey', "Whether the chat view is visible."));
    /** Whether there is an active chat request */
    TerminalChatContextKeys.requestActive = new RawContextKey("terminalChatActiveRequest" /* TerminalChatContextKeyStrings.ChatActiveRequest */, false, localize('chatRequestActiveContextKey', "Whether there is an active chat request."));
    /** Whether the chat input has text */
    TerminalChatContextKeys.inputHasText = new RawContextKey("terminalChatInputHasText" /* TerminalChatContextKeyStrings.ChatInputHasText */, false, localize('chatInputHasTextContextKey', "Whether the chat input has text."));
    /** The chat response contains at least one code block */
    TerminalChatContextKeys.responseContainsCodeBlock = new RawContextKey("terminalChatResponseContainsCodeBlock" /* TerminalChatContextKeyStrings.ChatResponseContainsCodeBlock */, false, localize('chatResponseContainsCodeBlockContextKey', "Whether the chat response contains a code block."));
    /** The chat response contains multiple code blocks */
    TerminalChatContextKeys.responseContainsMultipleCodeBlocks = new RawContextKey("terminalChatResponseContainsMultipleCodeBlocks" /* TerminalChatContextKeyStrings.ChatResponseContainsMultipleCodeBlocks */, false, localize('chatResponseContainsMultipleCodeBlocksContextKey', "Whether the chat response contains multiple code blocks."));
    /** A chat agent exists for the terminal location */
    TerminalChatContextKeys.hasChatAgent = new RawContextKey("terminalChatAgentRegistered" /* TerminalChatContextKeyStrings.ChatAgentRegistered */, false, localize('chatAgentRegisteredContextKey', "Whether a chat agent is registered for the terminal location."));
})(TerminalChatContextKeys || (TerminalChatContextKeys = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDaGF0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXQvYnJvd3Nlci90ZXJtaW5hbENoYXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUMzRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFFeEYsTUFBTSxDQUFOLElBQWtCLHFCQVdqQjtBQVhELFdBQWtCLHFCQUFxQjtJQUN0Qyx1RUFBOEMsQ0FBQTtJQUM5Qyx1RUFBOEMsQ0FBQTtJQUM5QyxtRkFBMEQsQ0FBQTtJQUMxRCx5RUFBZ0QsQ0FBQTtJQUNoRCxpRkFBd0QsQ0FBQTtJQUN4RCwyRkFBa0UsQ0FBQTtJQUNsRSx1RkFBOEQsQ0FBQTtJQUM5RCxpR0FBd0UsQ0FBQTtJQUN4RSxpRkFBd0QsQ0FBQTtJQUN4RCxxRkFBNEQsQ0FBQTtBQUM3RCxDQUFDLEVBWGlCLHFCQUFxQixLQUFyQixxQkFBcUIsUUFXdEM7QUFFRCxNQUFNLENBQUMsTUFBTSw0Q0FBNEMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFDN0YsTUFBTSxDQUFDLE1BQU0sZ0NBQWdDLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBQ3hGLE1BQU0sQ0FBQyxNQUFNLGlDQUFpQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLENBQUMsQ0FBQztBQUUxRixNQUFNLENBQU4sSUFBa0IsNkJBV2pCO0FBWEQsV0FBa0IsNkJBQTZCO0lBQzlDLGdFQUErQixDQUFBO0lBQy9CLG9FQUFtQyxDQUFBO0lBQ25DLGdGQUErQyxDQUFBO0lBQy9DLDhFQUE2QyxDQUFBO0lBQzdDLG9GQUFtRCxDQUFBO0lBQ25ELGdHQUErRCxDQUFBO0lBQy9ELHdHQUF1RSxDQUFBO0lBQ3ZFLDBIQUF5RixDQUFBO0lBQ3pGLGtIQUFpRixDQUFBO0lBQ2pGLDRGQUEyRCxDQUFBO0FBQzVELENBQUMsRUFYaUIsNkJBQTZCLEtBQTdCLDZCQUE2QixRQVc5QztBQUdELE1BQU0sS0FBVyx1QkFBdUIsQ0FzQnZDO0FBdEJELFdBQWlCLHVCQUF1QjtJQUV2Qyx5Q0FBeUM7SUFDNUIsK0JBQU8sR0FBRyxJQUFJLGFBQWEsb0VBQW1ELEtBQUssRUFBRSxRQUFRLENBQUMsdUJBQXVCLEVBQUUsbUNBQW1DLENBQUMsQ0FBQyxDQUFDO0lBRTFLLHlDQUF5QztJQUM1QiwrQkFBTyxHQUFHLElBQUksYUFBYSx3RUFBcUQsS0FBSyxFQUFFLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxtQ0FBbUMsQ0FBQyxDQUFDLENBQUM7SUFFNUssOENBQThDO0lBQ2pDLHFDQUFhLEdBQUcsSUFBSSxhQUFhLG9GQUEyRCxLQUFLLEVBQUUsUUFBUSxDQUFDLDZCQUE2QixFQUFFLDBDQUEwQyxDQUFDLENBQUMsQ0FBQztJQUVyTSxzQ0FBc0M7SUFDekIsb0NBQVksR0FBRyxJQUFJLGFBQWEsa0ZBQTBELEtBQUssRUFBRSxRQUFRLENBQUMsNEJBQTRCLEVBQUUsa0NBQWtDLENBQUMsQ0FBQyxDQUFDO0lBRTFMLHlEQUF5RDtJQUM1QyxpREFBeUIsR0FBRyxJQUFJLGFBQWEsNEdBQXVFLEtBQUssRUFBRSxRQUFRLENBQUMseUNBQXlDLEVBQUUsa0RBQWtELENBQUMsQ0FBQyxDQUFDO0lBRWpQLHNEQUFzRDtJQUN6QywwREFBa0MsR0FBRyxJQUFJLGFBQWEsOEhBQWdGLEtBQUssRUFBRSxRQUFRLENBQUMsa0RBQWtELEVBQUUsMERBQTBELENBQUMsQ0FBQyxDQUFDO0lBRXBSLG9EQUFvRDtJQUN2QyxvQ0FBWSxHQUFHLElBQUksYUFBYSx3RkFBNkQsS0FBSyxFQUFFLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSwrREFBK0QsQ0FBQyxDQUFDLENBQUM7QUFDOU4sQ0FBQyxFQXRCZ0IsdUJBQXVCLEtBQXZCLHVCQUF1QixRQXNCdkMifQ==