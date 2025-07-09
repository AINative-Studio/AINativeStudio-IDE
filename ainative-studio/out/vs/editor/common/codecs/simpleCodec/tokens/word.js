/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { Position } from '../../../../../editor/common/core/position.js';
/**
 * A token that represent a word - a set of continuous
 * characters without stop characters, like a `space`,
 * a `tab`, or a `new line`.
 */
export class Word extends BaseToken {
    constructor(
    /**
     * The word range.
     */
    range, 
    /**
     * The string value of the word.
     */
    text) {
        super(range);
        this.text = text;
    }
    /**
     * Create new `Word` token with the given `text` and the range
     * inside the given `Line` at the specified `column number`.
     */
    static newOnLine(text, line, atColumnNumber) {
        const { range } = line;
        const startPosition = new Position(range.startLineNumber, atColumnNumber);
        const endPosition = new Position(range.startLineNumber, atColumnNumber + text.length);
        return new Word(Range.fromPositions(startPosition, endPosition), text);
    }
    /**
     * Check if this token is equal to another one.
     */
    equals(other) {
        if (!super.equals(other)) {
            return false;
        }
        if (!(other instanceof Word)) {
            return false;
        }
        return this.text === other.text;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `word("${this.text}")${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvZGVjcy9zaW1wbGVDb2RlYy90b2tlbnMvd29yZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFL0MsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUV6RTs7OztHQUlHO0FBQ0gsTUFBTSxPQUFPLElBQUssU0FBUSxTQUFTO0lBQ2xDO0lBQ0M7O09BRUc7SUFDSCxLQUFZO0lBRVo7O09BRUc7SUFDYSxJQUFZO1FBRTVCLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUZHLFNBQUksR0FBSixJQUFJLENBQVE7SUFHN0IsQ0FBQztJQUVEOzs7T0FHRztJQUNJLE1BQU0sQ0FBQyxTQUFTLENBQ3RCLElBQVksRUFDWixJQUFVLEVBQ1YsY0FBc0I7UUFFdEIsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQztRQUV2QixNQUFNLGFBQWEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQzFFLE1BQU0sV0FBVyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsY0FBYyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUV0RixPQUFPLElBQUksSUFBSSxDQUNkLEtBQUssQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxFQUMvQyxJQUFJLENBQ0osQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNhLE1BQU0sQ0FBc0IsS0FBUTtRQUNuRCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzFCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELElBQUksQ0FBQyxDQUFDLEtBQUssWUFBWSxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQzlCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLElBQUksS0FBSyxLQUFLLENBQUMsSUFBSSxDQUFDO0lBQ2pDLENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxTQUFTLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzVDLENBQUM7Q0FDRCJ9