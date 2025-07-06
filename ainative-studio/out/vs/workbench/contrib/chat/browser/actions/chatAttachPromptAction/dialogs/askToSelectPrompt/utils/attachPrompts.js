/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { showChatView, showEditsView } from '../../../../../chat.js';
import { assertDefined } from '../../../../../../../../../base/common/types.js';
import { ACTION_ID_NEW_CHAT, ACTION_ID_NEW_EDIT_SESSION } from '../../../../chatClearActions.js';
/**
 * Attaches provided prompts to a chat input.
 */
export const attachPrompts = async (files, options, keyMods) => {
    const widget = await getChatWidgetObject(options, keyMods);
    for (const file of files) {
        widget
            .attachmentModel
            .promptInstructions
            .add(file.value);
    }
    return widget;
};
/**
 * Gets a chat widget based on the provided {@link IChatAttachPromptActionOptions.widget widget}
 * reference. If no widget reference is provided, the function will reveal a `chat panel` by default
 * (either a last focused, or a new one), but if the {@link altOption} is set to `true`, a `chat edits`
 * panel will be revealed instead (likewise either a last focused, or a new one).
 *
 * @throws if failed to reveal a chat widget.
 */
const getChatWidgetObject = async (options, keyMods) => {
    const { widget } = options;
    const { alt, ctrlCmd } = keyMods;
    // if `ctrl/cmd` key was pressed, create a new chat session
    if (ctrlCmd) {
        return await openNewChat(options, alt);
    }
    // if no widget reference is present, the command was triggered from outside of
    // an active chat input, so we reveal a chat widget window based on the `alt`
    // key modifier state when a prompt was selected from the picker UI dialog
    if (!widget) {
        return await showExistingChat(options, alt);
    }
    return widget;
};
/**
 * Opens a new chat session based on the `unified chat view` mode
 * enablement, and provided `edits` flag.
 */
const openNewChat = async (options, edits) => {
    const { commandService, chatService, viewsService } = options;
    // the `unified chat view` mode does not have a separate `edits` view
    // therefore we always open a new default chat session in this mode
    if (chatService.unifiedViewEnabled === true) {
        await commandService.executeCommand(ACTION_ID_NEW_CHAT);
        const widget = await showChatView(viewsService);
        assertDefined(widget, 'Chat widget must be defined.');
        return widget;
    }
    // in non-unified chat view mode, we can open either an `edits` view
    // or an `ask` chat view based on the `edits` flag
    (edits === true)
        ? await commandService.executeCommand(ACTION_ID_NEW_EDIT_SESSION)
        : await commandService.executeCommand(ACTION_ID_NEW_CHAT);
    const widget = (edits === true)
        ? await showEditsView(viewsService)
        : await showChatView(viewsService);
    assertDefined(widget, 'Chat widget must be defined.');
    return widget;
};
/**
 * Shows an existing chat view based on the `unified chat view` mode
 * enablement, and provided `edits` flag.
 */
const showExistingChat = async (options, edits) => {
    const { chatService, viewsService } = options;
    // there is no "edits" view when in the unified view mode
    const widget = (edits && (chatService.unifiedViewEnabled === false))
        ? await showEditsView(viewsService)
        : await showChatView(viewsService);
    assertDefined(widget, 'Revealed chat widget must be defined.');
    return widget;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXR0YWNoUHJvbXB0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRBdHRhY2hQcm9tcHRBY3Rpb24vZGlhbG9ncy9hc2tUb1NlbGVjdFByb21wdC91dGlscy9hdHRhY2hQcm9tcHRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBZSxZQUFZLEVBQUUsYUFBYSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFbEYsT0FBTyxFQUFFLGFBQWEsRUFBZ0IsTUFBTSxpREFBaUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUdqRzs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRyxLQUFLLEVBQ2pDLEtBQThDLEVBQzlDLE9BQTZCLEVBQzdCLE9BQWlCLEVBQ00sRUFBRTtJQUN6QixNQUFNLE1BQU0sR0FBRyxNQUFNLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUUzRCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQzFCLE1BQU07YUFDSixlQUFlO2FBQ2Ysa0JBQWtCO2FBQ2xCLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbkIsQ0FBQztJQUVELE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQyxDQUFDO0FBRUY7Ozs7Ozs7R0FPRztBQUNILE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxFQUNoQyxPQUE2QixFQUM3QixPQUFpQixFQUNNLEVBQUU7SUFDekIsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQztJQUMzQixNQUFNLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxHQUFHLE9BQU8sQ0FBQztJQUVqQywyREFBMkQ7SUFDM0QsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUNiLE9BQU8sTUFBTSxXQUFXLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRCwrRUFBK0U7SUFDL0UsNkVBQTZFO0lBQzdFLDBFQUEwRTtJQUMxRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDYixPQUFPLE1BQU0sZ0JBQWdCLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUMsQ0FBQztBQUVGOzs7R0FHRztBQUNILE1BQU0sV0FBVyxHQUFHLEtBQUssRUFDeEIsT0FBNkIsRUFDN0IsS0FBYyxFQUNTLEVBQUU7SUFDekIsTUFBTSxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLEdBQUcsT0FBTyxDQUFDO0lBRTlELHFFQUFxRTtJQUNyRSxtRUFBbUU7SUFDbkUsSUFBSSxXQUFXLENBQUMsa0JBQWtCLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDN0MsTUFBTSxjQUFjLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDeEQsTUFBTSxNQUFNLEdBQUcsTUFBTSxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFaEQsYUFBYSxDQUNaLE1BQU0sRUFDTiw4QkFBOEIsQ0FDOUIsQ0FBQztRQUVGLE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVELG9FQUFvRTtJQUNwRSxrREFBa0Q7SUFDbEQsQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDO1FBQ2YsQ0FBQyxDQUFDLE1BQU0sY0FBYyxDQUFDLGNBQWMsQ0FBQywwQkFBMEIsQ0FBQztRQUNqRSxDQUFDLENBQUMsTUFBTSxjQUFjLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFFM0QsTUFBTSxNQUFNLEdBQUcsQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDO1FBQzlCLENBQUMsQ0FBQyxNQUFNLGFBQWEsQ0FBQyxZQUFZLENBQUM7UUFDbkMsQ0FBQyxDQUFDLE1BQU0sWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBRXBDLGFBQWEsQ0FDWixNQUFNLEVBQ04sOEJBQThCLENBQzlCLENBQUM7SUFFRixPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUMsQ0FBQztBQUVGOzs7R0FHRztBQUNILE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxFQUM3QixPQUE2QixFQUM3QixLQUFjLEVBQ1MsRUFBRTtJQUN6QixNQUFNLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxHQUFHLE9BQU8sQ0FBQztJQUU5Qyx5REFBeUQ7SUFDekQsTUFBTSxNQUFNLEdBQUcsQ0FBQyxLQUFLLElBQUksQ0FBQyxXQUFXLENBQUMsa0JBQWtCLEtBQUssS0FBSyxDQUFDLENBQUM7UUFDbkUsQ0FBQyxDQUFDLE1BQU0sYUFBYSxDQUFDLFlBQVksQ0FBQztRQUNuQyxDQUFDLENBQUMsTUFBTSxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUM7SUFFcEMsYUFBYSxDQUNaLE1BQU0sRUFDTix1Q0FBdUMsQ0FDdkMsQ0FBQztJQUVGLE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQyxDQUFDIn0=