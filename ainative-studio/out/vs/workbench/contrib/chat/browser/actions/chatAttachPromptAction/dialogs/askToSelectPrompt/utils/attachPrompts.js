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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXR0YWNoUHJvbXB0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0QXR0YWNoUHJvbXB0QWN0aW9uL2RpYWxvZ3MvYXNrVG9TZWxlY3RQcm9tcHQvdXRpbHMvYXR0YWNoUHJvbXB0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQWUsWUFBWSxFQUFFLGFBQWEsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBRWxGLE9BQU8sRUFBRSxhQUFhLEVBQWdCLE1BQU0saURBQWlELENBQUM7QUFDOUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLDBCQUEwQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFHakc7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxhQUFhLEdBQUcsS0FBSyxFQUNqQyxLQUE4QyxFQUM5QyxPQUE2QixFQUM3QixPQUFpQixFQUNNLEVBQUU7SUFDekIsTUFBTSxNQUFNLEdBQUcsTUFBTSxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFFM0QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUMxQixNQUFNO2FBQ0osZUFBZTthQUNmLGtCQUFrQjthQUNsQixHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ25CLENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUMsQ0FBQztBQUVGOzs7Ozs7O0dBT0c7QUFDSCxNQUFNLG1CQUFtQixHQUFHLEtBQUssRUFDaEMsT0FBNkIsRUFDN0IsT0FBaUIsRUFDTSxFQUFFO0lBQ3pCLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUM7SUFDM0IsTUFBTSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsR0FBRyxPQUFPLENBQUM7SUFFakMsMkRBQTJEO0lBQzNELElBQUksT0FBTyxFQUFFLENBQUM7UUFDYixPQUFPLE1BQU0sV0FBVyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRUQsK0VBQStFO0lBQy9FLDZFQUE2RTtJQUM3RSwwRUFBMEU7SUFDMUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2IsT0FBTyxNQUFNLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRUQsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDLENBQUM7QUFFRjs7O0dBR0c7QUFDSCxNQUFNLFdBQVcsR0FBRyxLQUFLLEVBQ3hCLE9BQTZCLEVBQzdCLEtBQWMsRUFDUyxFQUFFO0lBQ3pCLE1BQU0sRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxHQUFHLE9BQU8sQ0FBQztJQUU5RCxxRUFBcUU7SUFDckUsbUVBQW1FO0lBQ25FLElBQUksV0FBVyxDQUFDLGtCQUFrQixLQUFLLElBQUksRUFBRSxDQUFDO1FBQzdDLE1BQU0sY0FBYyxDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sTUFBTSxHQUFHLE1BQU0sWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRWhELGFBQWEsQ0FDWixNQUFNLEVBQ04sOEJBQThCLENBQzlCLENBQUM7UUFFRixPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFRCxvRUFBb0U7SUFDcEUsa0RBQWtEO0lBQ2xELENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQztRQUNmLENBQUMsQ0FBQyxNQUFNLGNBQWMsQ0FBQyxjQUFjLENBQUMsMEJBQTBCLENBQUM7UUFDakUsQ0FBQyxDQUFDLE1BQU0sY0FBYyxDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBRTNELE1BQU0sTUFBTSxHQUFHLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQztRQUM5QixDQUFDLENBQUMsTUFBTSxhQUFhLENBQUMsWUFBWSxDQUFDO1FBQ25DLENBQUMsQ0FBQyxNQUFNLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUVwQyxhQUFhLENBQ1osTUFBTSxFQUNOLDhCQUE4QixDQUM5QixDQUFDO0lBRUYsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDLENBQUM7QUFFRjs7O0dBR0c7QUFDSCxNQUFNLGdCQUFnQixHQUFHLEtBQUssRUFDN0IsT0FBNkIsRUFDN0IsS0FBYyxFQUNTLEVBQUU7SUFDekIsTUFBTSxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsR0FBRyxPQUFPLENBQUM7SUFFOUMseURBQXlEO0lBQ3pELE1BQU0sTUFBTSxHQUFHLENBQUMsS0FBSyxJQUFJLENBQUMsV0FBVyxDQUFDLGtCQUFrQixLQUFLLEtBQUssQ0FBQyxDQUFDO1FBQ25FLENBQUMsQ0FBQyxNQUFNLGFBQWEsQ0FBQyxZQUFZLENBQUM7UUFDbkMsQ0FBQyxDQUFDLE1BQU0sWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBRXBDLGFBQWEsQ0FDWixNQUFNLEVBQ04sdUNBQXVDLENBQ3ZDLENBQUM7SUFFRixPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUMsQ0FBQyJ9