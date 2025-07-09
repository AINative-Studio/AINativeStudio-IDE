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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlUHJvbXB0Q29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvcHJvbXB0U3ludGF4L2NvbnRyaWJ1dGlvbnMvdXNlUHJvbXB0Q29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFcEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzdELE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFckUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDeEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM1RixPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRTVGLE9BQU8sRUFBcUIsWUFBWSxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xILE9BQU8sRUFBRSxtQkFBbUIsRUFBb0IsTUFBTSxxRUFBcUUsQ0FBQztBQUM1SCxPQUFPLEVBQWtDLHVCQUF1QixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFFekk7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsK0JBQStCLENBQUM7QUFFMUQ7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