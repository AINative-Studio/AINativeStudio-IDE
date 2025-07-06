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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvcHJvbXB0U3ludGF4L2NvbnRyaWJ1dGlvbnMvY3JlYXRlUHJvbXB0Q29tbWFuZC9lcnJvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRXZEOztHQUVHO0FBQ0gsTUFBTSxxQkFBc0IsU0FBUSxLQUFLO0NBQUk7QUFFN0M7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLFlBQWEsU0FBUSxxQkFBcUI7SUFDdEQsWUFBWSxJQUFZO1FBQ3ZCLEtBQUssQ0FBQyxRQUFRLENBQ2Isc0RBQXNELEVBQ3RELGlDQUFpQyxFQUNqQyxJQUFJLENBQ0osQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNEO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8saUJBQWtCLFNBQVEscUJBQXFCO0lBQzNELFlBQVksSUFBWTtRQUN2QixLQUFLLENBQUMsUUFBUSxDQUNiLDREQUE0RCxFQUM1RCxpQ0FBaUMsRUFDakMsSUFBSSxDQUNKLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRCJ9