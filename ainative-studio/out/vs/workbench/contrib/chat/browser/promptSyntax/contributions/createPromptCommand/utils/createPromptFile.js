/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FolderExists, InvalidPromptName } from '../errors.js';
import { URI } from '../../../../../../../../base/common/uri.js';
import { assert } from '../../../../../../../../base/common/assert.js';
import { VSBuffer } from '../../../../../../../../base/common/buffer.js';
import { dirname } from '../../../../../../../../base/common/resources.js';
import { isPromptFile } from '../../../../../../../../platform/prompts/common/constants.js';
/**
 * Create a prompt file at the provided folder and with
 * the provided file content.
 *
 * @throws in the following cases:
 *  - if the `fileName` does not end with {@link PROMPT_FILE_EXTENSION}
 *  - if a folder or file with the same already name exists in the destination folder
 */
export const createPromptFile = async (options) => {
    const { fileName, folder, content, fileService, openerService } = options;
    const promptUri = URI.joinPath(folder, fileName);
    assert(isPromptFile(promptUri), new InvalidPromptName(fileName));
    // if a folder or file with the same name exists, throw an error
    if (await fileService.exists(promptUri)) {
        const promptInfo = await fileService.resolve(promptUri);
        // if existing object is a folder, throw an error
        assert(!promptInfo.isDirectory, new FolderExists(promptUri.fsPath));
        // prompt file already exists so open it
        await openerService.open(promptUri);
        return promptUri;
    }
    // ensure the parent folder of the prompt file exists
    await fileService.createFolder(dirname(promptUri));
    // create the prompt file with the provided text content
    await fileService.createFile(promptUri, VSBuffer.fromString(content));
    return promptUri;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlUHJvbXB0RmlsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL3Byb21wdFN5bnRheC9jb250cmlidXRpb25zL2NyZWF0ZVByb21wdENvbW1hbmQvdXRpbHMvY3JlYXRlUHJvbXB0RmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUczRSxPQUFPLEVBQUUsWUFBWSxFQUF5QixNQUFNLDhEQUE4RCxDQUFDO0FBMEJuSDs7Ozs7OztHQU9HO0FBQ0gsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxFQUNwQyxPQUFpQyxFQUNsQixFQUFFO0lBQ2pCLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLEdBQUcsT0FBTyxDQUFDO0lBRTFFLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBRWpELE1BQU0sQ0FDTCxZQUFZLENBQUMsU0FBUyxDQUFDLEVBQ3ZCLElBQUksaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQy9CLENBQUM7SUFFRixnRUFBZ0U7SUFDaEUsSUFBSSxNQUFNLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztRQUN6QyxNQUFNLFVBQVUsR0FBRyxNQUFNLFdBQVcsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFeEQsaURBQWlEO1FBQ2pELE1BQU0sQ0FDTCxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQ3ZCLElBQUksWUFBWSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FDbEMsQ0FBQztRQUVGLHdDQUF3QztRQUN4QyxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFcEMsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELHFEQUFxRDtJQUNyRCxNQUFNLFdBQVcsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFFbkQsd0RBQXdEO0lBQ3hELE1BQU0sV0FBVyxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBRXRFLE9BQU8sU0FBUyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyJ9