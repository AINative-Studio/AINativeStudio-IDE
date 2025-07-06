/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../../nls.js';
/**
 * Base class for all prompt creation errors.
 */
class BaseCreatePromptError extends Error {
}
/**
 * Error for when a folder already exists at the provided
 * prompt file path.
 */
export class FolderExists extends BaseCreatePromptError {
    constructor(path) {
        super(localize('workbench.command.prompts.create.error.folder-exists', "Folder already exists at '{0}'.", path));
    }
}
/**
 * Error for when an invalid prompt file name is provided.
 */
export class InvalidPromptName extends BaseCreatePromptError {
    constructor(name) {
        super(localize('workbench.command.prompts.create.error.invalid-prompt-name', "Invalid prompt file name '{0}'.", name));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL3Byb21wdFN5bnRheC9jb250cmlidXRpb25zL2NyZWF0ZVByb21wdENvbW1hbmQvZXJyb3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUV2RDs7R0FFRztBQUNILE1BQU0scUJBQXNCLFNBQVEsS0FBSztDQUFJO0FBRTdDOzs7R0FHRztBQUNILE1BQU0sT0FBTyxZQUFhLFNBQVEscUJBQXFCO0lBQ3RELFlBQVksSUFBWTtRQUN2QixLQUFLLENBQUMsUUFBUSxDQUNiLHNEQUFzRCxFQUN0RCxpQ0FBaUMsRUFDakMsSUFBSSxDQUNKLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRDtBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGlCQUFrQixTQUFRLHFCQUFxQjtJQUMzRCxZQUFZLElBQVk7UUFDdkIsS0FBSyxDQUFDLFFBQVEsQ0FDYiw0REFBNEQsRUFDNUQsaUNBQWlDLEVBQ2pDLElBQUksQ0FDSixDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0QifQ==