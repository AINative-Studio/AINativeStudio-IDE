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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlUHJvbXB0RmlsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvcHJvbXB0U3ludGF4L2NvbnRyaWJ1dGlvbnMvY3JlYXRlUHJvbXB0Q29tbWFuZC91dGlscy9jcmVhdGVQcm9tcHRGaWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDekUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRzNFLE9BQU8sRUFBRSxZQUFZLEVBQXlCLE1BQU0sOERBQThELENBQUM7QUEwQm5IOzs7Ozs7O0dBT0c7QUFDSCxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLEVBQ3BDLE9BQWlDLEVBQ2xCLEVBQUU7SUFDakIsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxhQUFhLEVBQUUsR0FBRyxPQUFPLENBQUM7SUFFMUUsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFFakQsTUFBTSxDQUNMLFlBQVksQ0FBQyxTQUFTLENBQUMsRUFDdkIsSUFBSSxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FDL0IsQ0FBQztJQUVGLGdFQUFnRTtJQUNoRSxJQUFJLE1BQU0sV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1FBQ3pDLE1BQU0sVUFBVSxHQUFHLE1BQU0sV0FBVyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUV4RCxpREFBaUQ7UUFDakQsTUFBTSxDQUNMLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFDdkIsSUFBSSxZQUFZLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUNsQyxDQUFDO1FBRUYsd0NBQXdDO1FBQ3hDLE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUVwQyxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRUQscURBQXFEO0lBQ3JELE1BQU0sV0FBVyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztJQUVuRCx3REFBd0Q7SUFDeEQsTUFBTSxXQUFXLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFFdEUsT0FBTyxTQUFTLENBQUM7QUFDbEIsQ0FBQyxDQUFDIn0=