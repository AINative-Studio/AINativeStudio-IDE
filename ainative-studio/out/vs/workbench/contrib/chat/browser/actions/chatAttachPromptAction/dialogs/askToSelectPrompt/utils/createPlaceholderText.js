/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../../../../nls.js';
import { ALT_KEY_NAME, SUPER_KEY_NAME } from '../constants.js';
/**
 * Creates a placeholder text to show in the prompt selection dialog.
 */
export const createPlaceholderText = (options) => {
    const { widget, chatService } = options;
    let text = localize('commands.prompts.use.select-dialog.placeholder', 'Select a prompt to use');
    // if no widget reference is provided, add the note about `options`
    // and `cmd` modifiers users can leverage to alter the command behavior
    if (widget === undefined) {
        const superModifierNote = localize('commands.prompts.use.select-dialog.super-modifier-note', '{0}-key to use in new chat', SUPER_KEY_NAME);
        const altOptionModifierNote = localize('commands.prompts.use.select-dialog.alt-modifier-note', ' or {0}-key to use in Copilot Edits', ALT_KEY_NAME);
        // "open in-edits" action does not really fit the unified chat view mode
        const openInEditsNote = (chatService.unifiedViewEnabled === true)
            ? ''
            : altOptionModifierNote;
        text += localize('commands.prompts.use.select-dialog.modifier-notes', ' (hold {0}{1})', superModifierNote, openInEditsNote);
    }
    return text;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlUGxhY2Vob2xkZXJUZXh0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0QXR0YWNoUHJvbXB0QWN0aW9uL2RpYWxvZ3MvYXNrVG9TZWxlY3RQcm9tcHQvdXRpbHMvY3JlYXRlUGxhY2Vob2xkZXJUZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRy9EOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsQ0FDcEMsT0FBNkIsRUFDcEIsRUFBRTtJQUNYLE1BQU0sRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLEdBQUcsT0FBTyxDQUFDO0lBRXhDLElBQUksSUFBSSxHQUFHLFFBQVEsQ0FDbEIsZ0RBQWdELEVBQ2hELHdCQUF3QixDQUN4QixDQUFDO0lBRUYsbUVBQW1FO0lBQ25FLHVFQUF1RTtJQUN2RSxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUMxQixNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FDakMsd0RBQXdELEVBQ3hELDRCQUE0QixFQUM1QixjQUFjLENBQ2QsQ0FBQztRQUVGLE1BQU0scUJBQXFCLEdBQUcsUUFBUSxDQUNyQyxzREFBc0QsRUFDdEQscUNBQXFDLEVBQ3JDLFlBQVksQ0FDWixDQUFDO1FBRUYsd0VBQXdFO1FBQ3hFLE1BQU0sZUFBZSxHQUFHLENBQUMsV0FBVyxDQUFDLGtCQUFrQixLQUFLLElBQUksQ0FBQztZQUNoRSxDQUFDLENBQUMsRUFBRTtZQUNKLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztRQUV6QixJQUFJLElBQUksUUFBUSxDQUNmLG1EQUFtRCxFQUNuRCxnQkFBZ0IsRUFDaEIsaUJBQWlCLEVBQ2pCLGVBQWUsQ0FDZixDQUFDO0lBQ0gsQ0FBQztJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2IsQ0FBQyxDQUFDIn0=