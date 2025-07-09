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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFjY2Vzc2liaWxpdHlIZWxwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRBY2Nlc3NpYmlsaXR5SGVscC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUN2RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLHlCQUF5QixFQUFnRCxNQUFNLGlFQUFpRSxDQUFDO0FBRTFKLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUU3RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDMUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN4RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFaEQsTUFBTSxPQUFPLDBCQUEwQjtJQUF2QztRQUNVLGFBQVEsR0FBRyxHQUFHLENBQUM7UUFDZixTQUFJLEdBQUcsV0FBVyxDQUFDO1FBQ25CLFNBQUksd0NBQTJCO1FBQy9CLFNBQUksR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxFQUFFLGVB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