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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlUHJvbXB0RmlsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9wcm9tcHRTeW50YXgvY29udHJpYnV0aW9ucy9jcmVhdGVQcm9tcHRDb21tYW5kL3V0aWxzL2NyZWF0ZVByb21wdEZpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDakUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFHM0UsT0FBTyxFQUFFLFlBQVksRUFBeUIsTUFBTSw4REFBOEQsQ0FBQztBQTBCbkg7Ozs7Ozs7R0FPRztBQUNILE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLEtBQUssRUFDcEMsT0FBaUMsRUFDbEIsRUFBRTtJQUNqQixNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSxHQUFHLE9BQU8sQ0FBQztJQUUxRSxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztJQUVqRCxNQUFNLENBQ0wsWUFBWSxDQUFDLFNBQVMsQ0FBQyxFQUN2QixJQUFJLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUMvQixDQUFDO0lBRUYsZ0VBQWdFO0lBQ2hFLElBQUksTUFBTSxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7UUFDekMsTUFBTSxVQUFVLEdBQUcsTUFBTSxXQUFXLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRXhELGlEQUFpRDtRQUNqRCxNQUFNLENBQ0wsQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUN2QixJQUFJLFlBQVksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQ2xDLENBQUM7UUFFRix3Q0FBd0M7UUFDeEMsTUFBTSxhQUFhLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRXBDLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxxREFBcUQ7SUFDckQsTUFBTSxXQUFXLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBRW5ELHdEQUF3RDtJQUN4RCxNQUFNLFdBQVcsQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUV0RSxPQUFPLFNBQVMsQ0FBQztBQUNsQixDQUFDLENBQUMifQ==