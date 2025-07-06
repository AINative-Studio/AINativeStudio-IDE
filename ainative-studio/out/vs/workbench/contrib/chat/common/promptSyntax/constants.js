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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29uc3RhbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxvQ0FBb0MsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRWxJOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsNENBQTRDLENBQUM7QUFFOUU7O0dBRUc7QUFDSCxNQUFNLDZCQUE2QixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDbkQ7OztPQUdHO0lBQ0gsT0FBTyxxQkFBcUIsRUFBRTtJQUU5Qjs7T0FFRztJQUNILGNBQWMsb0NBQW9DLEVBQUU7Q0FDcEQsQ0FBQyxDQUFDO0FBRUg7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBbUIsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUM5RCxPQUFPLEVBQUUsSUFBSSw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUc7Q0FDdkQsQ0FBQyxDQUFDIn0=