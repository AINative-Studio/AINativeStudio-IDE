/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { COPILOT_CUSTOM_INSTRUCTIONS_FILENAME, PROMPT_FILE_EXTENSION } from '../../../../../platform/prompts/common/constants.js';
/**
 * Documentation link for the reusable prompts feature.
 */
export const DOCUMENTATION_URL = 'https://aka.ms/vscode-ghcp-prompt-snippets';
/**
 * Supported reusable prompt file patterns.
 */
const REUSABLE_PROMPT_FILE_PATTERNS = Object.freeze([
    /**
     * Any file that has the prompt file extension.
     * See {@link PROMPT_FILE_EXTENSION}.
     */
    `**/*${PROMPT_FILE_EXTENSION}`,
    /**
     * Copilot custom instructions file inside a `.github` folder.
     */
    `**/.github/${COPILOT_CUSTOM_INSTRUCTIONS_FILENAME}`,
]);
/**
 * Prompt files language selector.
 */
export const LANGUAGE_SELECTOR = Object.freeze({
    pattern: `{${REUSABLE_PROMPT_FILE_PATTERNS.join(',')}}`,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb25zdGFudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLHFCQUFxQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFFbEk7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyw0Q0FBNEMsQ0FBQztBQUU5RTs7R0FFRztBQUNILE1BQU0sNkJBQTZCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUNuRDs7O09BR0c7SUFDSCxPQUFPLHFCQUFxQixFQUFFO0lBRTlCOztPQUVHO0lBQ0gsY0FBYyxvQ0FBb0MsRUFBRTtDQUNwRCxDQUFDLENBQUM7QUFFSDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFtQixNQUFNLENBQUMsTUFBTSxDQUFDO0lBQzlELE9BQU8sRUFBRSxJQUFJLDZCQUE2QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRztDQUN2RCxDQUFDLENBQUMifQ==