/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { assert } from '../../../../../base/common/assert.js';
import { Range } from '../../../../../editor/common/core/range.js';
/**
 * Token representing a line of text with a `range` which
 * reflects the line's position in the original data.
 */
export class Line extends BaseToken {
    constructor(
    // the line index
    // Note! 1-based indexing
    lineNumber, 
    // the line contents
    text) {
        assert(!isNaN(lineNumber), `The line number must not be a NaN.`);
        assert(lineNumber > 0, `The line number must be >= 1, got "${lineNumber}".`);
        super(new Range(lineNumber, 1, lineNumber, text.length + 1));
        this.text = text;
    }
    /**
     * Check if this token is equal to another one.
     */
    equals(other) {
        if (!super.equals(other)) {
            return false;
        }
        if (!(other instanceof Line)) {
            return false;
        }
        return this.text === other.text;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `line("${this.text}")${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29kZWNzL2xpbmVzQ29kZWMvdG9rZW5zL2xpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFbkU7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLElBQUssU0FBUSxTQUFTO0lBQ2xDO0lBQ0MsaUJBQWlCO0lBQ2pCLHlCQUF5QjtJQUN6QixVQUFrQjtJQUNsQixvQkFBb0I7SUFDSixJQUFZO1FBRTVCLE1BQU0sQ0FDTCxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFDbEIsb0NBQW9DLENBQ3BDLENBQUM7UUFFRixNQUFNLENBQ0wsVUFBVSxHQUFHLENBQUMsRUFDZCxzQ0FBc0MsVUFBVSxJQUFJLENBQ3BELENBQUM7UUFFRixLQUFLLENBQ0osSUFBSSxLQUFLLENBQ1IsVUFBVSxFQUNWLENBQUMsRUFDRCxVQUFVLEVBQ1YsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQ2YsQ0FDRCxDQUFDO1FBbkJjLFNBQUksR0FBSixJQUFJLENBQVE7SUFvQjdCLENBQUM7SUFFRDs7T0FFRztJQUNhLE1BQU0sQ0FBc0IsS0FBUTtRQUNuRCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzFCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELElBQUksQ0FBQyxDQUFDLEtBQUssWUFBWSxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQzlCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLElBQUksS0FBSyxLQUFLLENBQUMsSUFBSSxDQUFDO0lBQ2pDLENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxTQUFTLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzVDLENBQUM7Q0FDRCJ9