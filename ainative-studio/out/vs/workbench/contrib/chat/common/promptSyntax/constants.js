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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvbnN0YW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsb0NBQW9DLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUVsSTs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLDRDQUE0QyxDQUFDO0FBRTlFOztHQUVHO0FBQ0gsTUFBTSw2QkFBNkIsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQ25EOzs7T0FHRztJQUNILE9BQU8scUJBQXFCLEVBQUU7SUFFOUI7O09BRUc7SUFDSCxjQUFjLG9DQUFvQyxFQUFFO0NBQ3BELENBQUMsQ0FBQztBQUVIOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQW1CLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDOUQsT0FBTyxFQUFFLElBQUksNkJBQTZCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHO0NBQ3ZELENBQUMsQ0FBQyJ9