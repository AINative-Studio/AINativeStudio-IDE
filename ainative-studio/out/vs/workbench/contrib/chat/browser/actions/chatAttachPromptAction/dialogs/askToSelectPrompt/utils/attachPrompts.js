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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXR0YWNoUHJvbXB0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdEF0dGFjaFByb21wdEFjdGlvbi9kaWFsb2dzL2Fza1RvU2VsZWN0UHJvbXB0L3V0aWxzL2F0dGFjaFByb21wdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFlLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUVsRixPQUFPLEVBQUUsYUFBYSxFQUFnQixNQUFNLGlEQUFpRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBR2pHOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFHLEtBQUssRUFDakMsS0FBOEMsRUFDOUMsT0FBNkIsRUFDN0IsT0FBaUIsRUFDTSxFQUFFO0lBQ3pCLE1BQU0sTUFBTSxHQUFHLE1BQU0sbUJBQW1CLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBRTNELEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7UUFDMUIsTUFBTTthQUNKLGVBQWU7YUFDZixrQkFBa0I7YUFDbEIsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNuQixDQUFDO0lBRUQsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDLENBQUM7QUFFRjs7Ozs7OztHQU9HO0FBQ0gsTUFBTSxtQkFBbUIsR0FBRyxLQUFLLEVBQ2hDLE9BQTZCLEVBQzdCLE9BQWlCLEVBQ00sRUFBRTtJQUN6QixNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDO0lBQzNCLE1BQU0sRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLEdBQUcsT0FBTyxDQUFDO0lBRWpDLDJEQUEyRDtJQUMzRCxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ2IsT0FBTyxNQUFNLFdBQVcsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUVELCtFQUErRTtJQUMvRSw2RUFBNkU7SUFDN0UsMEVBQTBFO0lBQzFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNiLE9BQU8sTUFBTSxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVELE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQyxDQUFDO0FBRUY7OztHQUdHO0FBQ0gsTUFBTSxXQUFXLEdBQUcsS0FBSyxFQUN4QixPQUE2QixFQUM3QixLQUFjLEVBQ1MsRUFBRTtJQUN6QixNQUFNLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsR0FBRyxPQUFPLENBQUM7SUFFOUQscUVBQXFFO0lBQ3JFLG1FQUFtRTtJQUNuRSxJQUFJLFdBQVcsQ0FBQyxrQkFBa0IsS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUM3QyxNQUFNLGNBQWMsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUN4RCxNQUFNLE1BQU0sR0FBRyxNQUFNLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUVoRCxhQUFhLENBQ1osTUFBTSxFQUNOLDhCQUE4QixDQUM5QixDQUFDO1FBRUYsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRUQsb0VBQW9FO0lBQ3BFLGtEQUFrRDtJQUNsRCxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUM7UUFDZixDQUFDLENBQUMsTUFBTSxjQUFjLENBQUMsY0FBYyxDQUFDLDBCQUEwQixDQUFDO1FBQ2pFLENBQUMsQ0FBQyxNQUFNLGNBQWMsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUUzRCxNQUFNLE1BQU0sR0FBRyxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUM7UUFDOUIsQ0FBQyxDQUFDLE1BQU0sYUFBYSxDQUFDLFlBQVksQ0FBQztRQUNuQyxDQUFDLENBQUMsTUFBTSxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUM7SUFFcEMsYUFBYSxDQUNaLE1BQU0sRUFDTiw4QkFBOEIsQ0FDOUIsQ0FBQztJQUVGLE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQyxDQUFDO0FBRUY7OztHQUdHO0FBQ0gsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLEVBQzdCLE9BQTZCLEVBQzdCLEtBQWMsRUFDUyxFQUFFO0lBQ3pCLE1BQU0sRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLEdBQUcsT0FBTyxDQUFDO0lBRTlDLHlEQUF5RDtJQUN6RCxNQUFNLE1BQU0sR0FBRyxDQUFDLEtBQUssSUFBSSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsS0FBSyxLQUFLLENBQUMsQ0FBQztRQUNuRSxDQUFDLENBQUMsTUFBTSxhQUFhLENBQUMsWUFBWSxDQUFDO1FBQ25DLENBQUMsQ0FBQyxNQUFNLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUVwQyxhQUFhLENBQ1osTUFBTSxFQUNOLHVDQUF1QyxDQUN2QyxDQUFDO0lBRUYsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDLENBQUMifQ==