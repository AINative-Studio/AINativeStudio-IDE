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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNrRm9yUHJvbXB0TmFtZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9wcm9tcHRTeW50YXgvY29udHJpYnV0aW9ucy9jcmVhdGVQcm9tcHRDb21tYW5kL2RpYWxvZ3MvYXNrRm9yUHJvbXB0TmFtZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFHckc7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLEVBQ3BDLEtBQXVCLEVBQ3ZCLGlCQUFxQyxFQUNQLEVBQUU7SUFDaEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLENBQzNDO1FBQ0MsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsOENBQThDLEVBQzlDLHVCQUF1QixFQUN2QixxQkFBcUIsQ0FDckI7S0FDRCxDQUFDLENBQUM7SUFFSixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDYixPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRUQsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ2xDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNsQixPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRUQsTUFBTSxTQUFTLEdBQUcsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDOUQsQ0FBQyxDQUFDLFdBQVc7UUFDYixDQUFDLENBQUMsR0FBRyxXQUFXLEdBQUcscUJBQXFCLEVBQUUsQ0FBQztJQUU1QyxPQUFPLFNBQVMsQ0FBQztBQUNsQixDQUFDLENBQUMifQ==