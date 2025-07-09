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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDaGF0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0L2Jyb3dzZXIvdGVybWluYWxDaGF0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDM0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRXhGLE1BQU0sQ0FBTixJQUFrQixxQkFXakI7QUFYRCxXQUFrQixxQkFBcUI7SUFDdEMsdUVBQThDLENBQUE7SUFDOUMsdUVBQThDLENBQUE7SUFDOUMsbUZBQTBELENBQUE7SUFDMUQseUVBQWdELENBQUE7SUFDaEQsaUZBQXdELENBQUE7SUFDeEQsMkZBQWtFLENBQUE7SUFDbEUsdUZBQThELENBQUE7SUFDOUQsaUdBQXdFLENBQUE7SUFDeEUsaUZBQXdELENBQUE7SUFDeEQscUZBQTRELENBQUE7QUFDN0QsQ0FBQyxFQVhpQixxQkFBcUIsS0FBckIscUJBQXFCLFFBV3RDO0FBRUQsTUFBTSxDQUFDLE1BQU0sNENBQTRDLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBQzdGLE1BQU0sQ0FBQyxNQUFNLGdDQUFnQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQztBQUN4RixNQUFNLENBQUMsTUFBTSxpQ0FBaUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLDRCQUE0QixDQUFDLENBQUM7QUFFMUYsTUFBTSxDQUFOLElBQWtCLDZCQVdqQjtBQVhELFdBQWtCLDZCQUE2QjtJQUM5QyxnRUFBK0IsQ0FBQTtJQUMvQixvRUFBbUMsQ0FBQTtJQUNuQyxnRkFBK0MsQ0FBQTtJQUMvQyw4RUFBNkMsQ0FBQTtJQUM3QyxvRkFBbUQsQ0FBQTtJQUNuRCxnR0FBK0QsQ0FBQTtJQUMvRCx3R0FBdUUsQ0FBQTtJQUN2RSwwSEFBeUYsQ0FBQTtJQUN6RixrSEFBaUYsQ0FBQTtJQUNqRiw0RkFBMkQsQ0FBQTtBQUM1RCxDQUFDLEVBWGlCLDZCQUE2QixLQUE3Qiw2QkFBNkIsUUFXOUM7QUFHRCxNQUFNLEtBQVcsdUJBQXVCLENBc0J2QztBQXRCRCxXQUFpQix1QkFBdUI7SUFFdkMseUNBQXlDO0lBQzVCLCtCQUFPLEdBQUcsSUFBSSxhQUFhLG9FQUFtRCxLQUFLLEVBQUUsUUFBUSxDQUFDLHVCQUF1QixFQUFFLG1DQUFtQyxDQUFDLENBQUMsQ0FBQztJQUUxSyx5Q0FBeUM7SUFDNUIsK0JBQU8sR0FBRyxJQUFJLGFBQWEsd0VBQXFELEtBQUssRUFBRSxRQUFRLENBQUMsdUJBQXVCLEVBQUUsbUNBQW1DLENBQUMsQ0FBQyxDQUFDO0lBRTVLLDhDQUE4QztJQUNqQyxxQ0FBYSxHQUFHLElBQUksYUFBYSxvRkFBMkQsS0FBSyxFQUFFLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSwwQ0FBMEMsQ0FBQyxDQUFDLENBQUM7SUFFck0sc0NBQXNDO0lBQ3pCLG9DQUFZLEdBQUcsSUFBSSxhQUFhLGtGQUEwRCxLQUFLLEVBQUUsUUFBUSxDQUFDLDRCQUE0QixFQUFFLGtDQUFrQyxDQUFDLENBQUMsQ0FBQztJQUUxTCx5REFBeUQ7SUFDNUMsaURBQXlCLEdBQUcsSUFBSSxhQUFhLDRHQUF1RSxLQUFLLEVBQUUsUUFBUSxDQUFDLHlDQUF5QyxFQUFFLGtEQUFrRCxDQUFDLENBQUMsQ0FBQztJQUVqUCxzREFBc0Q7SUFDekMsMERBQWtDLEdBQUcsSUFBSSxhQUFhLDhIQUFnRixLQUFLLEVBQUUsUUFBUSxDQUFDLGtEQUFrRCxFQUFFLDBEQUEwRCxDQUFDLENBQUMsQ0FBQztJQUVwUixvREFBb0Q7SUFDdkMsb0NBQVksR0FBRyxJQUFJLGFBQWEsd0ZBQTZELEtBQUssRUFBRSxRQUFRLENBQUMsK0JBQStCLEVBQUUsK0RBQStELENBQUMsQ0FBQyxDQUFDO0FBQzlOLENBQUMsRUF0QmdCLHVCQUF1QixLQUF2Qix1QkFBdUIsUUFzQnZDIn0=