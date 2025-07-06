/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { AccessibleDiffViewerNext } from '../../../../../editor/browser/widget/diffEditor/commands.js';
import { localize } from '../../../../../nls.js';
import { AccessibleContentProvider } from '../../../../../platform/accessibility/browser/accessibleView.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { INLINE_CHAT_ID } from '../../../inlineChat/common/inlineChat.js';
import { ChatContextKeyExprs, ChatContextKeys } from '../../common/chatContextKeys.js';
import { ChatAgentLocation, ChatMode } from '../../common/constants.js';
import { IChatWidgetService } from '../chat.js';
export class PanelChatAccessibilityHelp {
    constructor() {
        this.priority = 107;
        this.name = 'panelChat';
        this.type = "help" /* AccessibleViewType.Help */;
        this.when = ContextKeyExpr.and(ChatContextKeys.location.isEqualTo(ChatAgentLocation.Panel), ChatContextKeys.inQuickChat.negate(), ChatContextKeys.chatMode.isEqualTo(ChatMode.Ask), ContextKeyExpr.or(ChatContextKeys.inChatSession, ChatContextKeys.isResponse, ChatContextKeys.isRequest));
    }
    getProvider(accessor) {
        const codeEditor = accessor.get(ICodeEditorService).getActiveCodeEditor() || accessor.get(ICodeEditorService).getFocusedCodeEditor();
        return getChatAccessibilityHelpProvider(accessor, codeEditor ?? undefined, 'panelChat');
    }
}
export class QuickChatAccessibilityHelp {
    constructor() {
        this.priority = 107;
        this.name = 'quickChat';
        this.type = "help" /* AccessibleViewType.Help */;
        this.when = ContextKeyExpr.and(ChatContextKeys.inQuickChat, ContextKeyExpr.or(ChatContextKeys.inChatSession, ChatContextKeys.isResponse, ChatContextKeys.isRequest));
    }
    getProvider(accessor) {
        const codeEditor = accessor.get(ICodeEditorService).getActiveCodeEditor() || accessor.get(ICodeEditorService).getFocusedCodeEditor();
        return getChatAccessibilityHelpProvider(accessor, codeEditor ?? undefined, 'quickChat');
    }
}
export class EditsChatAccessibilityHelp {
    constructor() {
        this.priority = 119;
        this.name = 'editsView';
        this.type = "help" /* AccessibleViewType.Help */;
        this.when = ContextKeyExpr.and(ChatContextKeyExprs.inEditingMode, ChatContextKeys.inChatInput);
    }
    getProvider(accessor) {
        const codeEditor = accessor.get(ICodeEditorService).getActiveCodeEditor() || accessor.get(ICodeEditorService).getFocusedCodeEditor();
        return getChatAccessibilityHelpProvider(accessor, codeEditor ?? undefined, 'editsView');
    }
}
export class AgentChatAccessibilityHelp {
    constructor() {
        this.priority = 120;
        this.name = 'agentView';
        this.type = "help" /* AccessibleViewType.Help */;
        this.when = ContextKeyExpr.and(ChatContextKeys.chatMode.isEqualTo(ChatMode.Agent), ChatContextKeys.inChatInput);
    }
    getProvider(accessor) {
        const codeEditor = accessor.get(ICodeEditorService).getActiveCodeEditor() || accessor.get(ICodeEditorService).getFocusedCodeEditor();
        return getChatAccessibilityHelpProvider(accessor, codeEditor ?? undefined, 'agentView');
    }
}
export function getAccessibilityHelpText(type, keybindingService) {
    const content = [];
    if (type === 'panelChat' || type === 'quickChat') {
        if (type === 'quickChat') {
            content.push(localize('chat.overview', 'The quick chat view is comprised of an input box and a request/response list. The input box is used to make requests and the list is used to display responses.'));
            content.push(localize('chat.differenceQuick', 'The quick chat view is a transient interface for making and viewing requests, while the panel chat view is a persistent interface that also supports navigating suggested follow-up questions.'));
        }
        if (type === 'panelChat') {
            content.push(localize('chat.differencePanel', 'The panel chat view is a persistent interface that also supports navigating suggested follow-up questions, while the quick chat view is a transient interface for making and viewing requests.'));
            content.push(localize('chat.followUp', 'In the input box, navigate to the suggested follow up question (Shift+Tab) and press Enter to run it.'));
        }
        content.push(localize('chat.requestHistory', 'In the input box, use up and down arrows to navigate your request history. Edit input and use enter or the submit button to run a new request.'));
        content.push(localize('chat.inspectResponse', 'In the input box, inspect the last response in the accessible view{0}.', '<keybinding:editor.action.accessibleView>'));
        content.push(localize('chat.announcement', 'Chat responses will be announced as they come in. A response will indicate the number of code blocks, if any, and then the rest of the response.'));
        content.push(localize('workbench.action.chat.focus', 'To focus the chat request/response list, which can be navigated with up and down arrows, invoke the Focus Chat command{0}.', getChatFocusKeybindingLabel(keybindingService, type, false)));
        content.push(localize('workbench.action.chat.focusInput', 'To focus the input box for chat requests, invoke the Focus Chat Input command{0}.', getChatFocusKeybindingLabel(keybindingService, type, true)));
        content.push(localize('workbench.action.chat.nextCodeBlock', 'To focus the next code block within a response, invoke the Chat: Next Code Block command{0}.', '<keybinding:workbench.action.chat.nextCodeBlock>'));
        if (type === 'panelChat') {
            content.push(localize('workbench.action.chat.newChat', 'To create a new chat session, invoke the New Chat command{0}.', '<keybinding:workbench.action.chat.new>'));
        }
    }
    if (type === 'editsView' || type === 'agentView') {
        if (type === 'agentView') {
            content.push(localize('chatAgent.overview', 'The chat agent view is used to apply edits across files in your workspace, enable running commands in the terminal, and more.'));
        }
        else {
            content.push(localize('chatEditing.overview', 'The chat editing view is used to apply edits across files.'));
        }
        content.push(localize('chatEditing.format', 'It is comprised of an input box and a file working set (Shift+Tab).'));
        content.push(localize('chatEditing.expectation', 'When a request is made, a progress indicator will play while the edits are being applied.'));
        content.push(localize('chatEditing.review', 'Once the edits are applied, a sound will play to indicate the document has been opened and is ready for review. The sound can be disabled with accessibility.signals.chatEditModifiedFile.'));
        content.push(localize('chatEditing.sections', 'Navigate between edits in the editor with navigate previous{0} and next{1}', '<keybinding:chatEditor.action.navigatePrevious>', '<keybinding:chatEditor.action.navigateNext>'));
        content.push(localize('chatEditing.acceptHunk', 'In the editor, Keep{0}, Undo{1}, or Toggle the Diff{2} for the current Change.', '<keybinding:chatEditor.action.acceptHunk>', '<keybinding:chatEditor.action.undoHunk>', '<keybinding:chatEditor.action.toggleDiff>'));
        content.push(localize('chatEditing.undoKeepSounds', 'Sounds will play when a change is accepted or undone. The sounds can be disabled with accessibility.signals.editsKept and accessibility.signals.editsUndone.'));
        if (type === 'agentView') {
            content.push(localize('chatAgent.userActionRequired', 'An alert will indicate when user action is required. For example, if the agent wants to run something in the terminal, you will hear Action Required: Run Command in Terminal.'));
            content.push(localize('chatAgent.runCommand', 'To take the action, use the accept tool command{0}.', '<keybinding:workbench.action.chat.acceptTool>'));
        }
        content.push(localize('chatEditing.helpfulCommands', 'Some helpful commands include:'));
        content.push(localize('workbench.action.chat.undoEdits', '- Undo Edits{0}.', '<keybinding:workbench.action.chat.undoEdits>'));
        content.push(localize('workbench.action.chat.editing.attachFiles', '- Attach Files{0}.', '<keybinding:workbench.action.chat.editing.attachFiles>'));
        content.push(localize('chatEditing.removeFileFromWorkingSet', '- Remove File from Working Set{0}.', '<keybinding:chatEditing.removeFileFromWorkingSet>'));
        content.push(localize('chatEditing.acceptFile', '- Keep{0} and Undo File{1}.', '<keybinding:chatEditing.acceptFile>', '<keybinding:chatEditing.discardFile>'));
        content.push(localize('chatEditing.saveAllFiles', '- Save All Files{0}.', '<keybinding:chatEditing.saveAllFiles>'));
        content.push(localize('chatEditing.acceptAllFiles', '- Keep All Edits{0}.', '<keybinding:chatEditing.acceptAllFiles>'));
        content.push(localize('chatEditing.discardAllFiles', '- Undo All Edits{0}.', '<keybinding:chatEditing.discardAllFiles>'));
        content.push(localize('chatEditing.openFileInDiff', '- Open File in Diff{0}.', '<keybinding:chatEditing.openFileInDiff>'));
        content.push(localize('chatEditing.viewChanges', '- View Changes{0}.', '<keybinding:chatEditing.viewChanges>'));
    }
    else {
        content.push(localize('inlineChat.overview', "Inline chat occurs within a code editor and takes into account the current selection. It is useful for making changes to the current editor. For example, fixing diagnostics, documenting or refactoring code. Keep in mind that AI generated code may be incorrect."));
        content.push(localize('inlineChat.access', "It can be activated via code actions or directly using the command: Inline Chat: Start Inline Chat{0}.", '<keybinding:inlineChat.start>'));
        content.push(localize('inlineChat.requestHistory', 'In the input box, use Show Previous{0} and Show Next{1} to navigate your request history. Edit input and use enter or the submit button to run a new request.', '<keybinding:history.showPrevious>', '<keybinding:history.showNext>'));
        content.push(localize('inlineChat.inspectResponse', 'In the input box, inspect the response in the accessible view{0}.', '<keybinding:editor.action.accessibleView>'));
        content.push(localize('inlineChat.contextActions', "Context menu actions may run a request prefixed with a /. Type / to discover such ready-made commands."));
        content.push(localize('inlineChat.fix', "If a fix action is invoked, a response will indicate the problem with the current code. A diff editor will be rendered and can be reached by tabbing."));
        content.push(localize('inlineChat.diff', "Once in the diff editor, enter review mode with{0}. Use up and down arrows to navigate lines with the proposed changes.", AccessibleDiffViewerNext.id));
        content.push(localize('inlineChat.toolbar', "Use tab to reach conditional parts like commands, status, message responses and more."));
    }
    content.push(localize('chat.signals', "Accessibility Signals can be changed via settings with a prefix of signals.chat. By default, if a request takes more than 4 seconds, you will hear a sound indicating that progress is still occurring."));
    return content.join('\n');
}
export function getChatAccessibilityHelpProvider(accessor, editor, type) {
    const widgetService = accessor.get(IChatWidgetService);
    const keybindingService = accessor.get(IKeybindingService);
    const inputEditor = type === 'panelChat' || type === 'editsView' || type === 'quickChat' ? widgetService.lastFocusedWidget?.inputEditor : editor;
    if (!inputEditor) {
        return;
    }
    const domNode = inputEditor.getDomNode() ?? undefined;
    if (!domNode) {
        return;
    }
    const cachedPosition = inputEditor.getPosition();
    inputEditor.getSupportedActions();
    const helpText = getAccessibilityHelpText(type, keybindingService);
    return new AccessibleContentProvider(type === 'panelChat' ? "panelChat" /* AccessibleViewProviderId.PanelChat */ : type === 'inlineChat' ? "inlineChat" /* AccessibleViewProviderId.InlineChat */ : type === 'agentView' ? "agentChat" /* AccessibleViewProviderId.AgentChat */ : "quickChat" /* AccessibleViewProviderId.QuickChat */, { type: "help" /* AccessibleViewType.Help */ }, () => helpText, () => {
        if (type === 'panelChat' && cachedPosition) {
            inputEditor.setPosition(cachedPosition);
            inputEditor.focus();
        }
        else if (type === 'inlineChat') {
            // TODO@jrieken find a better way for this
            const ctrl = editor?.getContribution(INLINE_CHAT_ID);
            ctrl?.focus();
        }
    }, type === 'panelChat' ? "accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */ : "accessibility.verbosity.inlineChat" /* AccessibilityVerbositySettingId.InlineChat */);
}
// The when clauses for actions may not be true when we invoke the accessible view, so we need to provide the keybinding label manually
// to ensure it's correct
function getChatFocusKeybindingLabel(keybindingService, type, focusInput) {
    let kbs;
    const fallback = ' (unassigned keybinding)';
    if (focusInput) {
        kbs = keybindingService.lookupKeybindings('workbench.action.chat.focusInput');
    }
    else {
        kbs = keybindingService.lookupKeybindings('chat.action.focus');
    }
    if (!kbs?.length) {
        return fallback;
    }
    let kb;
    if (type === 'panelChat') {
        if (focusInput) {
            kb = kbs.find(kb => kb.getAriaLabel()?.includes('DownArrow'))?.getAriaLabel();
        }
        else {
            kb = kbs.find(kb => kb.getAriaLabel()?.includes('UpArrow'))?.getAriaLabel();
        }
    }
    else {
        // Quick chat
        if (focusInput) {
            kb = kbs.find(kb => kb.getAriaLabel()?.includes('UpArrow'))?.getAriaLabel();
        }
        else {
            kb = kbs.find(kb => kb.getAriaLabel()?.includes('DownArrow'))?.getAriaLabel();
        }
    }
    return !!kb ? ` (${kb})` : fallback;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFjY2Vzc2liaWxpdHlIZWxwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdEFjY2Vzc2liaWxpdHlIZWxwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUseUJBQXlCLEVBQWdELE1BQU0saUVBQWlFLENBQUM7QUFFMUosT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRTdGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLFFBQVEsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3hFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUVoRCxNQUFNLE9BQU8sMEJBQTBCO0lBQXZDO1FBQ1UsYUFBUSxHQUFHLEdBQUcsQ0FBQztRQUNmLFNBQUksR0FBRyxXQUFXLENBQUM7UUFDbkIsU0FBSSx3Q0FBMkI7UUFDL0IsU0FBSSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLEVBQUUsZUFB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