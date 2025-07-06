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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNrRm9yUHJvbXB0TmFtZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL3Byb21wdFN5bnRheC9jb250cmlidXRpb25zL2NyZWF0ZVByb21wdENvbW1hbmQvZGlhbG9ncy9hc2tGb3JQcm9tcHROYW1lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUdyRzs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLEtBQUssRUFDcEMsS0FBdUIsRUFDdkIsaUJBQXFDLEVBQ1AsRUFBRTtJQUNoQyxNQUFNLE1BQU0sR0FBRyxNQUFNLGlCQUFpQixDQUFDLEtBQUssQ0FDM0M7UUFDQyxXQUFXLEVBQUUsUUFBUSxDQUNwQiw4Q0FBOEMsRUFDOUMsdUJBQXVCLEVBQ3ZCLHFCQUFxQixDQUNyQjtLQUNELENBQUMsQ0FBQztJQUVKLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNiLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDbEMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ2xCLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxNQUFNLFNBQVMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUM5RCxDQUFDLENBQUMsV0FBVztRQUNiLENBQUMsQ0FBQyxHQUFHLFdBQVcsR0FBRyxxQkFBcUIsRUFBRSxDQUFDO0lBRTVDLE9BQU8sU0FBUyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyJ9