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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlUGxhY2Vob2xkZXJUZXh0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRBdHRhY2hQcm9tcHRBY3Rpb24vZGlhbG9ncy9hc2tUb1NlbGVjdFByb21wdC91dGlscy9jcmVhdGVQbGFjZWhvbGRlclRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFHL0Q7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxDQUNwQyxPQUE2QixFQUNwQixFQUFFO0lBQ1gsTUFBTSxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsR0FBRyxPQUFPLENBQUM7SUFFeEMsSUFBSSxJQUFJLEdBQUcsUUFBUSxDQUNsQixnREFBZ0QsRUFDaEQsd0JBQXdCLENBQ3hCLENBQUM7SUFFRixtRUFBbUU7SUFDbkUsdUVBQXVFO0lBQ3ZFLElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQzFCLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUNqQyx3REFBd0QsRUFDeEQsNEJBQTRCLEVBQzVCLGNBQWMsQ0FDZCxDQUFDO1FBRUYsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQ3JDLHNEQUFzRCxFQUN0RCxxQ0FBcUMsRUFDckMsWUFBWSxDQUNaLENBQUM7UUFFRix3RUFBd0U7UUFDeEUsTUFBTSxlQUFlLEdBQUcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLEtBQUssSUFBSSxDQUFDO1lBQ2hFLENBQUMsQ0FBQyxFQUFFO1lBQ0osQ0FBQyxDQUFDLHFCQUFxQixDQUFDO1FBRXpCLElBQUksSUFBSSxRQUFRLENBQ2YsbURBQW1ELEVBQ25ELGdCQUFnQixFQUNoQixpQkFBaUIsRUFDakIsZUFBZSxDQUNmLENBQUM7SUFDSCxDQUFDO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDLENBQUMifQ==