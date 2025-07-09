/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../../../nls.js';
import { PROMPT_FILE_EXTENSION } from '../../../../../../../../platform/prompts/common/constants.js';
/**
 * Asks the user for a prompt name.
 */
export const askForPromptName = async (_type, quickInputService) => {
    const result = await quickInputService.input({
        placeHolder: localize('commands.prompts.create.ask-name.placeholder', "Provide a prompt name", PROMPT_FILE_EXTENSION),
    });
    if (!result) {
        return undefined;
    }
    const trimmedName = result.trim();
    if (!trimmedName) {
        return undefined;
    }
    const cleanName = (trimmedName.endsWith(PROMPT_FILE_EXTENSION))
        ? trimmedName
        : `${trimmedName}${PROMPT_FILE_EXTENSION}`;
    return cleanName;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNrRm9yUHJvbXB0TmFtZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvcHJvbXB0U3ludGF4L2NvbnRyaWJ1dGlvbnMvY3JlYXRlUHJvbXB0Q29tbWFuZC9kaWFsb2dzL2Fza0ZvclByb21wdE5hbWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBR3JHOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxFQUNwQyxLQUF1QixFQUN2QixpQkFBcUMsRUFDUCxFQUFFO0lBQ2hDLE1BQU0sTUFBTSxHQUFHLE1BQU0saUJBQWlCLENBQUMsS0FBSyxDQUMzQztRQUNDLFdBQVcsRUFBRSxRQUFRLENBQ3BCLDhDQUE4QyxFQUM5Qyx1QkFBdUIsRUFDdkIscUJBQXFCLENBQ3JCO0tBQ0QsQ0FBQyxDQUFDO0lBRUosSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2IsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNsQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDbEIsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELE1BQU0sU0FBUyxHQUFHLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQzlELENBQUMsQ0FBQyxXQUFXO1FBQ2IsQ0FBQyxDQUFDLEdBQUcsV0FBVyxHQUFHLHFCQUFxQixFQUFFLENBQUM7SUFFNUMsT0FBTyxTQUFTLENBQUM7QUFDbEIsQ0FBQyxDQUFDIn0=