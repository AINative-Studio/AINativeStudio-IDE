/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../editor/common/core/range.js';
/**
 * Base class for all tokens with a `range` that
 * reflects token position in the original data.
 */
export class BaseToken {
    constructor(_range) {
        this._range = _range;
    }
    get range() {
        return this._range;
    }
    /**
     * Check if this token has the same range as another one.
     */
    sameRange(other) {
        return this.range.equalsRange(other);
    }
    /**
     * Check if this token is equal to another one.
     */
    equals(other) {
        if (!(other instanceof this.constructor)) {
            return false;
        }
        return this.sameRange(other.range);
    }
    /**
     * Change `range` of the token with provided range components.
     */
    withRange(components) {
        this._range = new Range(components.startLineNumber ?? this.range.startLineNumber, components.startColumn ?? this.range.startColumn, components.endLineNumber ?? this.range.endLineNumber, components.endColumn ?? this.range.endColumn);
        return this;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZVRva2VuLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb2RlY3MvYmFzZVRva2VuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVyRTs7O0dBR0c7QUFDSCxNQUFNLE9BQWdCLFNBQVM7SUFDOUIsWUFDUyxNQUFhO1FBQWIsV0FBTSxHQUFOLE1BQU0sQ0FBTztJQUNsQixDQUFDO0lBRUwsSUFBVyxLQUFLO1FBQ2YsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3BCLENBQUM7SUFPRDs7T0FFRztJQUNJLFNBQVMsQ0FBQyxLQUFZO1FBQzVCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQU9EOztPQUVHO0lBQ0ksTUFBTSxDQUFzQixLQUFRO1FBQzFDLElBQUksQ0FBQyxDQUFDLEtBQUssWUFBWSxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUMxQyxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRDs7T0FFRztJQUNJLFNBQVMsQ0FBQyxVQUEyQjtRQUMzQyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksS0FBSyxDQUN0QixVQUFVLENBQUMsZUFBZSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUN4RCxVQUFVLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUNoRCxVQUFVLENBQUMsYUFBYSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUNwRCxVQUFVLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUM1QyxDQUFDO1FBRUYsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0NBQ0QifQ==