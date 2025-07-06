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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlUHJvbXB0UGlja0l0ZW0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0QXR0YWNoUHJvbXB0QWN0aW9uL2RpYWxvZ3MvYXNrVG9TZWxlY3RQcm9tcHQvdXRpbHMvY3JlYXRlUHJvbXB0UGlja0l0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBSTlFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBR3JHOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsQ0FDbkMsVUFBdUIsRUFDdkIsWUFBMkIsRUFDSSxFQUFFO0lBQ2pDLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsVUFBVSxDQUFDO0lBQ2pDLE1BQU0sb0JBQW9CLEdBQUcsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFckQsd0RBQXdEO0lBQ3hELDJEQUEyRDtJQUMzRCxNQUFNLFdBQVcsR0FBRyxDQUFDLElBQUksS0FBSyxNQUFNLENBQUM7UUFDcEMsQ0FBQyxDQUFDLFFBQVEsQ0FDVCx5QkFBeUIsRUFDekIsYUFBYSxDQUNiO1FBQ0QsQ0FBQyxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFFOUQsTUFBTSxPQUFPLEdBQUcsQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFDO1FBQ2hDLENBQUMsQ0FBQyxXQUFXO1FBQ2IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7SUFFZCxPQUFPO1FBQ04sRUFBRSxFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUU7UUFDbEIsSUFBSSxFQUFFLE1BQU07UUFDWixLQUFLLEVBQUUsb0JBQW9CO1FBQzNCLFdBQVc7UUFDWCxPQUFPO1FBQ1AsS0FBSyxFQUFFLEdBQUc7UUFDVixPQUFPLEVBQUUsQ0FBQyxXQUFXLEVBQUUsYUFBYSxDQUFDO0tBQ3JDLENBQUM7QUFDSCxDQUFDLENBQUMifQ==