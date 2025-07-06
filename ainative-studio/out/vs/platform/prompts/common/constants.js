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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcHJvbXB0cy9jb21tb24vY29uc3RhbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFeEQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxZQUFZLENBQUM7QUFFbEQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxvQ0FBb0MsR0FBRyx5QkFBeUIsQ0FBQztBQUU5RTs7O0dBR0c7QUFDSCxNQUFNLENBQUMsTUFBTSxVQUFVLEdBQVcsa0JBQWtCLENBQUM7QUFFckQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBVywyQkFBMkIsQ0FBQztBQUV4RTs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLGlCQUFpQixDQUFDO0FBRXZEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFHLENBQzNCLE9BQVksRUFDRixFQUFFO0lBQ1osTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUV4QyxNQUFNLHNCQUFzQixHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsQ0FBQztJQUN4RSxNQUFNLHdCQUF3QixHQUFHLENBQUMsUUFBUSxLQUFLLG9DQUFvQyxDQUFDLENBQUM7SUFFckYsT0FBTyxzQkFBc0IsSUFBSSx3QkFBd0IsQ0FBQztBQUMzRCxDQUFDLENBQUM7QUFFRjs7Ozs7R0FLRztBQUNILE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLENBQ2pDLE9BQVksRUFDSCxFQUFFO0lBQ1gsTUFBTSxDQUNMLFlBQVksQ0FBQyxPQUFPLENBQUMsRUFDckIsa0JBQWtCLE9BQU8sQ0FBQyxNQUFNLHlCQUF5QixDQUN6RCxDQUFDO0lBRUYsMEVBQTBFO0lBQzFFLGdEQUFnRDtJQUNoRCxNQUFNLGFBQWEsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLG9DQUFvQyxDQUFDLENBQUM7UUFDbEYsQ0FBQyxDQUFDLEtBQUs7UUFDUCxDQUFDLENBQUMscUJBQXFCLENBQUM7SUFFekIsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMifQ==