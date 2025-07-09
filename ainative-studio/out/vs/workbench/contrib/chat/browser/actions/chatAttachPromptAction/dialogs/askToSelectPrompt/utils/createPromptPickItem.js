/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../../../../nls.js';
import { DELETE_BUTTON, EDIT_BUTTON } from '../constants.js';
import { dirname } from '../../../../../../../../../base/common/resources.js';
import { getCleanPromptName } from '../../../../../../../../../platform/prompts/common/constants.js';
/**
 * Creates a quick pick item for a prompt.
 */
export const createPromptPickItem = (promptFile, labelService) => {
    const { uri, type } = promptFile;
    const fileWithoutExtension = getCleanPromptName(uri);
    // if a "user" prompt, don't show its filesystem path in
    // the user interface, but do that for all the "local" ones
    const description = (type === 'user')
        ? localize('user-prompt.capitalized', 'User prompt')
        : labelService.getUriLabel(dirname(uri), { relative: true });
    const tooltip = (type === 'user')
        ? description
        : uri.fsPath;
    return {
        id: uri.toString(),
        type: 'item',
        label: fileWithoutExtension,
        description,
        tooltip,
        value: uri,
        buttons: [EDIT_BUTTON, DELETE_BUTTON],
    };
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlUHJvbXB0UGlja0l0ZW0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdEF0dGFjaFByb21wdEFjdGlvbi9kaWFsb2dzL2Fza1RvU2VsZWN0UHJvbXB0L3V0aWxzL2NyZWF0ZVByb21wdFBpY2tJdGVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUk5RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUdyRzs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLENBQ25DLFVBQXVCLEVBQ3ZCLFlBQTJCLEVBQ0ksRUFBRTtJQUNqQyxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLFVBQVUsQ0FBQztJQUNqQyxNQUFNLG9CQUFvQixHQUFHLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRXJELHdEQUF3RDtJQUN4RCwyREFBMkQ7SUFDM0QsTUFBTSxXQUFXLEdBQUcsQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFDO1FBQ3BDLENBQUMsQ0FBQyxRQUFRLENBQ1QseUJBQXlCLEVBQ3pCLGFBQWEsQ0FDYjtRQUNELENBQUMsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBRTlELE1BQU0sT0FBTyxHQUFHLENBQUMsSUFBSSxLQUFLLE1BQU0sQ0FBQztRQUNoQyxDQUFDLENBQUMsV0FBVztRQUNiLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO0lBRWQsT0FBTztRQUNOLEVBQUUsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFO1FBQ2xCLElBQUksRUFBRSxNQUFNO1FBQ1osS0FBSyxFQUFFLG9CQUFvQjtRQUMzQixXQUFXO1FBQ1gsT0FBTztRQUNQLEtBQUssRUFBRSxHQUFHO1FBQ1YsT0FBTyxFQUFFLENBQUMsV0FBVyxFQUFFLGFBQWEsQ0FBQztLQUNyQyxDQUFDO0FBQ0gsQ0FBQyxDQUFDIn0=