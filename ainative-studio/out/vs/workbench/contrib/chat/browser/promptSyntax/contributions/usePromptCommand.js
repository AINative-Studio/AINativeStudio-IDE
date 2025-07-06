/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../nls.js';
import { CHAT_CATEGORY } from '../../actions/chatActions.js';
import { IChatWidgetService } from '../../chat.js';
import { ChatContextKeys } from '../../../common/chatContextKeys.js';
import { PromptsConfig } from '../../../../../../platform/prompts/common/config.js';
import { isPromptFile } from '../../../../../../platform/prompts/common/constants.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../../../platform/contextkey/common/contextkey.js';
import { MenuId, MenuRegistry } from '../../../../../../platform/actions/common/actions.js';
import { isCodeEditor, isDiffEditor } from '../../../../../../editor/browser/editorBrowser.js';
import { KeybindingsRegistry } from '../../../../../../platform/keybinding/common/keybindingsRegistry.js';
import { ATTACH_PROMPT_ACTION_ID } from '../../actions/chatAttachPromptAction/chatAttachPromptAction.js';
/**
 * Command ID of the "Use Prompt" command.
 */
export const COMMAND_ID = 'workbench.command.prompts.use';
/**
 * Keybinding of the "Use Prompt" command.
 * The `cmd + /` is the current keybinding for 'attachment', so we use
 * the `alt` key modifier to convey the "prompt attachment" action.
 */
const COMMAND_KEY_BINDING = 2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */ | 512 /* KeyMod.Alt */;
/**
 * Implementation of the "Use Prompt" command. The command works in the following way.
 *
 * When executed, it tries to see if a `prompt file` was open in the active code editor
 * (see {@link IChatAttachPromptActionOptions.resource resource}), and if a chat input
 * is focused (see {@link IChatAttachPromptActionOptions.widget widget}).
 *
 * Then the command shows prompt selection dialog to the user. If an active prompt file
 * was detected, it is pre-selected in the dialog. User can confirm (`enter`) or select
 * a different prompt file in the dialog.
 *
 * When a prompt file is selected by the user (or confirmed), the command attaches
 * the selected prompt to the focused chat input, if present. If no focused chat input
 * is present, the command would attach the prompt to a `chat panel` input by default
 * (either the last focused instance, or a new one). If the `alt` (`option` on mac) key
 * was pressed when the prompt was selected, a `chat edits` panel is used instead
 * (likewise either the last focused or a new one).
 */
const command = async (accessor) => {
    const commandService = accessor.get(ICommandService);
    const options = {
        resource: getActivePromptUri(accessor),
        widget: getFocusedChatWidget(accessor),
    };
    await commandService.executeCommand(ATTACH_PROMPT_ACTION_ID, options);
};
/**
 * Get chat widget reference to attach prompt to.
 */
export function getFocusedChatWidget(accessor) {
    const chatWidgetService = accessor.get(IChatWidgetService);
    const { lastFocusedWidget } = chatWidgetService;
    if (!lastFocusedWidget) {
        return undefined;
    }
    // the widget input `must` be focused at the time when command run
    if (!lastFocusedWidget.hasInputFocus()) {
        return undefined;
    }
    return lastFocusedWidget;
}
/**
 * Gets active editor instance, if any.
 */
export function getActiveCodeEditor(accessor) {
    const editorService = accessor.get(IEditorService);
    const { activeTextEditorControl } = editorService;
    if (isCodeEditor(activeTextEditorControl) && activeTextEditorControl.hasModel()) {
        return activeTextEditorControl;
    }
    if (isDiffEditor(activeTextEditorControl)) {
        const originalEditor = activeTextEditorControl.getOriginalEditor();
        if (!originalEditor.hasModel()) {
            return undefined;
        }
        return originalEditor;
    }
    return undefined;
}
/**
 * Gets `URI` of a prompt file open in an active editor instance, if any.
 */
const getActivePromptUri = (accessor) => {
    const activeEditor = getActiveCodeEditor(accessor);
    if (!activeEditor) {
        return undefined;
    }
    const { uri } = activeEditor.getModel();
    if (isPromptFile(uri)) {
        return uri;
    }
    return undefined;
};
/**
 * Register the "Use Prompt" command with its keybinding.
 */
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: COMMAND_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: COMMAND_KEY_BINDING,
    handler: command,
    when: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled),
});
/**
 * Register the "Use Prompt" command in the `command palette`.
 */
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: COMMAND_ID,
        title: localize('commands.prompts.use.title', "Use Prompt"),
        category: CHAT_CATEGORY
    },
    when: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlUHJvbXB0Q29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9wcm9tcHRTeW50YXgvY29udHJpYnV0aW9ucy91c2VQcm9tcHRDb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUVwRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDN0QsT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUVyRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDcEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUN4RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDekYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFNUYsT0FBTyxFQUFxQixZQUFZLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEgsT0FBTyxFQUFFLG1CQUFtQixFQUFvQixNQUFNLHFFQUFxRSxDQUFDO0FBQzVILE9BQU8sRUFBa0MsdUJBQXVCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUV6STs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRywrQkFBK0IsQ0FBQztBQUUxRDs7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