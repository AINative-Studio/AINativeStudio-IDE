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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9wcm9tcHRzL2NvbW1vbi9jb25zdGFudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUV4RDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLFlBQVksQ0FBQztBQUVsRDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUFHLHlCQUF5QixDQUFDO0FBRTlFOzs7R0FHRztBQUNILE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBVyxrQkFBa0IsQ0FBQztBQUVyRDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFXLDJCQUEyQixDQUFDO0FBRXhFOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsaUJBQWlCLENBQUM7QUFFdkQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxZQUFZLEdBQUcsQ0FDM0IsT0FBWSxFQUNGLEVBQUU7SUFDWixNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRXhDLE1BQU0sc0JBQXNCLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0lBQ3hFLE1BQU0sd0JBQXdCLEdBQUcsQ0FBQyxRQUFRLEtBQUssb0NBQW9DLENBQUMsQ0FBQztJQUVyRixPQUFPLHNCQUFzQixJQUFJLHdCQUF3QixDQUFDO0FBQzNELENBQUMsQ0FBQztBQUVGOzs7OztHQUtHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsQ0FDakMsT0FBWSxFQUNILEVBQUU7SUFDWCxNQUFNLENBQ0wsWUFBWSxDQUFDLE9BQU8sQ0FBQyxFQUNyQixrQkFBa0IsT0FBTyxDQUFDLE1BQU0seUJBQXlCLENBQ3pELENBQUM7SUFFRiwwRUFBMEU7SUFDMUUsZ0RBQWdEO0lBQ2hELE1BQU0sYUFBYSxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsb0NBQW9DLENBQUMsQ0FBQztRQUNsRixDQUFDLENBQUMsS0FBSztRQUNQLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztJQUV6QixPQUFPLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0FBQzlDLENBQUMsQ0FBQyJ9