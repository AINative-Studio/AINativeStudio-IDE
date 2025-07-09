/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assert } from '../../../base/common/assert.js';
import { basename } from '../../../base/common/path.js';
/**
 * File extension for the reusable prompt files.
 */
export const PROMPT_FILE_EXTENSION = '.prompt.md';
/**
 * Copilot custom instructions file name.
 */
export const COPILOT_CUSTOM_INSTRUCTIONS_FILENAME = 'copilot-instructions.md';
/**
 * Configuration key for the `reusable prompts` feature
 * (also known as `prompt files`, `prompt instructions`, etc.).
 */
export const CONFIG_KEY = 'chat.promptFiles';
/**
 * Configuration key for the locations of reusable prompt files.
 */
export const LOCATIONS_CONFIG_KEY = 'chat.promptFilesLocations';
/**
 * Default reusable prompt files source folder.
 */
export const DEFAULT_SOURCE_FOLDER = '.github/prompts';
/**
 * Check if provided path is a reusable prompt file.
 */
export const isPromptFile = (fileUri) => {
    const filename = basename(fileUri.path);
    const hasPromptFileExtension = filename.endsWith(PROMPT_FILE_EXTENSION);
    const isCustomInstructionsFile = (filename === COPILOT_CUSTOM_INSTRUCTIONS_FILENAME);
    return hasPromptFileExtension || isCustomInstructionsFile;
};
/**
 * Gets clean prompt name without file extension.
 *
 * @throws If provided path is not a prompt file
 * 		   (does not end with {@link PROMPT_FILE_EXTENSION}).
 */
export const getCleanPromptName = (fileUri) => {
    assert(isPromptFile(fileUri), `Provided path '${fileUri.fsPath}' is not a prompt file.`);
    // if a Copilot custom instructions file, remove `markdown` file extension
    // otherwise, remove the `prompt` file extension
    const fileExtension = (fileUri.path.endsWith(COPILOT_CUSTOM_INSTRUCTIONS_FILENAME))
        ? '.md'
        : PROMPT_FILE_EXTENSION;
    return basename(fileUri.path, fileExtension);
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Byb21wdHMvY29tbW9uL2NvbnN0YW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDeEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRXhEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsWUFBWSxDQUFDO0FBRWxEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sb0NBQW9DLEdBQUcseUJBQXlCLENBQUM7QUFFOUU7OztHQUdHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFXLGtCQUFrQixDQUFDO0FBRXJEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQVcsMkJBQTJCLENBQUM7QUFFeEU7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxpQkFBaUIsQ0FBQztBQUV2RDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLFlBQVksR0FBRyxDQUMzQixPQUFZLEVBQ0YsRUFBRTtJQUNaLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFeEMsTUFBTSxzQkFBc0IsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLENBQUM7SUFDeEUsTUFBTSx3QkFBd0IsR0FBRyxDQUFDLFFBQVEsS0FBSyxvQ0FBb0MsQ0FBQyxDQUFDO0lBRXJGLE9BQU8sc0JBQXNCLElBQUksd0JBQXdCLENBQUM7QUFDM0QsQ0FBQyxDQUFDO0FBRUY7Ozs7O0dBS0c7QUFDSCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxDQUNqQyxPQUFZLEVBQ0gsRUFBRTtJQUNYLE1BQU0sQ0FDTCxZQUFZLENBQUMsT0FBTyxDQUFDLEVBQ3JCLGtCQUFrQixPQUFPLENBQUMsTUFBTSx5QkFBeUIsQ0FDekQsQ0FBQztJQUVGLDBFQUEwRTtJQUMxRSxnREFBZ0Q7SUFDaEQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO1FBQ2xGLENBQUMsQ0FBQyxLQUFLO1FBQ1AsQ0FBQyxDQUFDLHFCQUFxQixDQUFDO0lBRXpCLE9BQU8sUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUM7QUFDOUMsQ0FBQyxDQUFDIn0=