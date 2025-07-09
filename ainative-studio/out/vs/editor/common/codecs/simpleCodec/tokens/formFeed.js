/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { Position } from '../../../../../editor/common/core/position.js';
/**
 * Token that represent a `form feed` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class FormFeed extends BaseToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '\f'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return FormFeed.symbol;
    }
    /**
     * Create new `FormFeed` token with range inside
     * the given `Line` at the given `column number`.
     */
    static newOnLine(line, atColumnNumber) {
        const { range } = line;
        const startPosition = new Position(range.startLineNumber, atColumnNumber);
        const endPosition = new Position(range.startLineNumber, atColumnNumber + this.symbol.length);
        return new FormFeed(Range.fromPositions(startPosition, endPosition));
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `formfeed${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybUZlZWQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb2RlY3Mvc2ltcGxlQ29kZWMvdG9rZW5zL2Zvcm1GZWVkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUUvQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBRXpFOzs7R0FHRztBQUNILE1BQU0sT0FBTyxRQUFTLFNBQVEsU0FBUztJQUN0Qzs7T0FFRzthQUNvQixXQUFNLEdBQVcsSUFBSSxDQUFDO0lBRTdDOztPQUVHO0lBQ0gsSUFBVyxJQUFJO1FBQ2QsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUFDO0lBQ3hCLENBQUM7SUFFRDs7O09BR0c7SUFDSSxNQUFNLENBQUMsU0FBUyxDQUN0QixJQUFVLEVBQ1YsY0FBc0I7UUFFdEIsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQztRQUV2QixNQUFNLGFBQWEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQzFFLE1BQU0sV0FBVyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsY0FBYyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFN0YsT0FBTyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUN0QyxhQUFhLEVBQ2IsV0FBVyxDQUNYLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxXQUFXLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNoQyxDQUFDIn0=