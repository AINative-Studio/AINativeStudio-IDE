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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVJlZmVyZW5jZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy90b2tlbnMvZmlsZVJlZmVyZW5jZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFJcEU7O0dBRUc7QUFDSCxNQUFNLGFBQWEsR0FBVyxNQUFNLENBQUM7QUFFckM7O0dBRUc7QUFDSCxNQUFNLE9BQU8sYUFBYyxTQUFRLHNCQUFzQjtJQUN4RCxZQUNDLEtBQVksRUFDSSxJQUFZO1FBRTVCLEtBQUssQ0FBQyxLQUFLLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRmxCLFNBQUksR0FBSixJQUFJLENBQVE7SUFHN0IsQ0FBQztJQUVEOzs7T0FHRztJQUNJLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBZ0M7UUFDbEQsTUFBTSxDQUNMLFFBQVEsQ0FBQyxJQUFJLEtBQUssYUFBYSxFQUMvQiwwQkFBMEIsYUFBYSxXQUFXLFFBQVEsQ0FBQyxJQUFJLElBQUksQ0FDbkUsQ0FBQztRQUVGLE9BQU8sSUFBSSxhQUFhLENBQ3ZCLFFBQVEsQ0FBQyxLQUFLLEVBQ2QsUUFBUSxDQUFDLElBQUksQ0FDYixDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ2EsTUFBTSxDQUFzQixLQUFRO1FBQ25ELElBQUksQ0FBQyxLQUFLLFlBQVksYUFBYSxDQUFDLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDaEQsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzVCLENBQUM7SUFFRDs7O09BR0c7SUFDSCxJQUFXLFNBQVM7UUFDbkIsT0FBTyxLQUFLLENBQUMsU0FBUyxDQUFDO0lBQ3hCLENBQUM7Q0FDRCJ9