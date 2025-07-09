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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9wcm9tcHRTeW50YXgvY29udHJpYnV0aW9ucy9jcmVhdGVQcm9tcHRDb21tYW5kL2Vycm9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFdkQ7O0dBRUc7QUFDSCxNQUFNLHFCQUFzQixTQUFRLEtBQUs7Q0FBSTtBQUU3Qzs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sWUFBYSxTQUFRLHFCQUFxQjtJQUN0RCxZQUFZLElBQVk7UUFDdkIsS0FBSyxDQUFDLFFBQVEsQ0FDYixzREFBc0QsRUFDdEQsaUNBQWlDLEVBQ2pDLElBQUksQ0FDSixDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyxpQkFBa0IsU0FBUSxxQkFBcUI7SUFDM0QsWUFBWSxJQUFZO1FBQ3ZCLEtBQUssQ0FBQyxRQUFRLENBQ2IsNERBQTRELEVBQzVELGlDQUFpQyxFQUNqQyxJQUFJLENBQ0osQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNEIn0=