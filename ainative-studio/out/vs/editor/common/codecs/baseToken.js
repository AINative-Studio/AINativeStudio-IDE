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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZVRva2VuLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29kZWNzL2Jhc2VUb2tlbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFckU7OztHQUdHO0FBQ0gsTUFBTSxPQUFnQixTQUFTO0lBQzlCLFlBQ1MsTUFBYTtRQUFiLFdBQU0sR0FBTixNQUFNLENBQU87SUFDbEIsQ0FBQztJQUVMLElBQVcsS0FBSztRQUNmLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNwQixDQUFDO0lBT0Q7O09BRUc7SUFDSSxTQUFTLENBQUMsS0FBWTtRQUM1QixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFPRDs7T0FFRztJQUNJLE1BQU0sQ0FBc0IsS0FBUTtRQUMxQyxJQUFJLENBQUMsQ0FBQyxLQUFLLFlBQVksSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7WUFDMUMsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxTQUFTLENBQUMsVUFBMkI7UUFDM0MsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLEtBQUssQ0FDdEIsVUFBVSxDQUFDLGVBQWUsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFDeEQsVUFBVSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFDaEQsVUFBVSxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFDcEQsVUFBVSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FDNUMsQ0FBQztRQUVGLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztDQUNEIn0=