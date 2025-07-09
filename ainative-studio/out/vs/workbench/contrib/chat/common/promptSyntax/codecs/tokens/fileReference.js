/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptVariableWithData } from './promptVariable.js';
import { assert } from '../../../../../../../base/common/assert.js';
/**
 * Name of the variable.
 */
const VARIABLE_NAME = 'file';
/**
 * Object represents a file reference token inside a chatbot prompt.
 */
export class FileReference extends PromptVariableWithData {
    constructor(range, path) {
        super(range, VARIABLE_NAME, path);
        this.path = path;
    }
    /**
     * Create a {@link FileReference} from a {@link PromptVariableWithData} instance.
     * @throws if variable name is not equal to {@link VARIABLE_NAME}.
     */
    static from(variable) {
        assert(variable.name === VARIABLE_NAME, `Variable name must be '${VARIABLE_NAME}', got '${variable.name}'.`);
        return new FileReference(variable.range, variable.data);
    }
    /**
     * Check if this token is equal to another one.
     */
    equals(other) {
        if ((other instanceof FileReference) === false) {
            return false;
        }
        return super.equals(other);
    }
    /**
     * Get the range of the `link` part of the token (e.g.,
     * the `/path/to/file.md` part of `#file:/path/to/file.md`).
     */
    get linkRange() {
        return super.dataRange;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVJlZmVyZW5jZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL3Rva2Vucy9maWxlUmVmZXJlbmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzdELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUlwRTs7R0FFRztBQUNILE1BQU0sYUFBYSxHQUFXLE1BQU0sQ0FBQztBQUVyQzs7R0FFRztBQUNILE1BQU0sT0FBTyxhQUFjLFNBQVEsc0JBQXNCO0lBQ3hELFlBQ0MsS0FBWSxFQUNJLElBQVk7UUFFNUIsS0FBSyxDQUFDLEtBQUssRUFBRSxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFGbEIsU0FBSSxHQUFKLElBQUksQ0FBUTtJQUc3QixDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFnQztRQUNsRCxNQUFNLENBQ0wsUUFBUSxDQUFDLElBQUksS0FBSyxhQUFhLEVBQy9CLDBCQUEwQixhQUFhLFdBQVcsUUFBUSxDQUFDLElBQUksSUFBSSxDQUNuRSxDQUFDO1FBRUYsT0FBTyxJQUFJLGFBQWEsQ0FDdkIsUUFBUSxDQUFDLEtBQUssRUFDZCxRQUFRLENBQUMsSUFBSSxDQUNiLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDYSxNQUFNLENBQXNCLEtBQVE7UUFDbkQsSUFBSSxDQUFDLEtBQUssWUFBWSxhQUFhLENBQUMsS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUNoRCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDNUIsQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQVcsU0FBUztRQUNuQixPQUFPLEtBQUssQ0FBQyxTQUFTLENBQUM7SUFDeEIsQ0FBQztDQUNEIn0=