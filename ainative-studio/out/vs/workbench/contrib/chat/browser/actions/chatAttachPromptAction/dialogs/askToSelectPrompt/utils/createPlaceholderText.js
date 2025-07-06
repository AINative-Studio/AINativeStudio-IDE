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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlUGxhY2Vob2xkZXJUZXh0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdEF0dGFjaFByb21wdEFjdGlvbi9kaWFsb2dzL2Fza1RvU2VsZWN0UHJvbXB0L3V0aWxzL2NyZWF0ZVBsYWNlaG9sZGVyVGV4dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUcvRDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLENBQ3BDLE9BQTZCLEVBQ3BCLEVBQUU7SUFDWCxNQUFNLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxHQUFHLE9BQU8sQ0FBQztJQUV4QyxJQUFJLElBQUksR0FBRyxRQUFRLENBQ2xCLGdEQUFnRCxFQUNoRCx3QkFBd0IsQ0FDeEIsQ0FBQztJQUVGLG1FQUFtRTtJQUNuRSx1RUFBdUU7SUFDdkUsSUFBSSxNQUFNLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDMUIsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQ2pDLHdEQUF3RCxFQUN4RCw0QkFBNEIsRUFDNUIsY0FBYyxDQUNkLENBQUM7UUFFRixNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FDckMsc0RBQXNELEVBQ3RELHFDQUFxQyxFQUNyQyxZQUFZLENBQ1osQ0FBQztRQUVGLHdFQUF3RTtRQUN4RSxNQUFNLGVBQWUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsS0FBSyxJQUFJLENBQUM7WUFDaEUsQ0FBQyxDQUFDLEVBQUU7WUFDSixDQUFDLENBQUMscUJBQXFCLENBQUM7UUFFekIsSUFBSSxJQUFJLFFBQVEsQ0FDZixtREFBbUQsRUFDbkQsZ0JBQWdCLEVBQ2hCLGlCQUFpQixFQUNqQixlQUFlLENBQ2YsQ0FBQztJQUNILENBQUM7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUMsQ0FBQyJ9