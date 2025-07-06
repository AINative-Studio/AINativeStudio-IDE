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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlUHJvbXB0UGlja0l0ZW0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRBdHRhY2hQcm9tcHRBY3Rpb24vZGlhbG9ncy9hc2tUb1NlbGVjdFByb21wdC91dGlscy9jcmVhdGVQcm9tcHRQaWNrSXRlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFJOUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFHckc7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxDQUNuQyxVQUF1QixFQUN2QixZQUEyQixFQUNJLEVBQUU7SUFDakMsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxVQUFVLENBQUM7SUFDakMsTUFBTSxvQkFBb0IsR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVyRCx3REFBd0Q7SUFDeEQsMkRBQTJEO0lBQzNELE1BQU0sV0FBVyxHQUFHLENBQUMsSUFBSSxLQUFLLE1BQU0sQ0FBQztRQUNwQyxDQUFDLENBQUMsUUFBUSxDQUNULHlCQUF5QixFQUN6QixhQUFhLENBQ2I7UUFDRCxDQUFDLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUU5RCxNQUFNLE9BQU8sR0FBRyxDQUFDLElBQUksS0FBSyxNQUFNLENBQUM7UUFDaEMsQ0FBQyxDQUFDLFdBQVc7UUFDYixDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztJQUVkLE9BQU87UUFDTixFQUFFLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRTtRQUNsQixJQUFJLEVBQUUsTUFBTTtRQUNaLEtBQUssRUFBRSxvQkFBb0I7UUFDM0IsV0FBVztRQUNYLE9BQU87UUFDUCxLQUFLLEVBQUUsR0FBRztRQUNWLE9BQU8sRUFBRSxDQUFDLFdBQVcsRUFBRSxhQUFhLENBQUM7S0FDckMsQ0FBQztBQUNILENBQUMsQ0FBQyJ9