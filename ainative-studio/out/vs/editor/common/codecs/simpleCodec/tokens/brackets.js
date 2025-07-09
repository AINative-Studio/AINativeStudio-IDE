/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { Range } from '../../../core/range.js';
import { Position } from '../../../core/position.js';
/**
 * A token that represent a `[` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class LeftBracket extends BaseToken {
    /**
     * The underlying symbol of the `LeftBracket` token.
     */
    static { this.symbol = '['; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return LeftBracket.symbol;
    }
    /**
     * Create new `LeftBracket` token with range inside
     * the given `Line` at the given `column number`.
     */
    static newOnLine(line, atColumnNumber) {
        const { range } = line;
        const startPosition = new Position(range.startLineNumber, atColumnNumber);
        const endPosition = new Position(range.startLineNumber, atColumnNumber + this.symbol.length);
        return new LeftBracket(Range.fromPositions(startPosition, endPosition));
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `left-bracket${this.range}`;
    }
}
/**
 * A token that represent a `]` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class RightBracket extends BaseToken {
    /**
     * The underlying symbol of the `RightBracket` token.
     */
    static { this.symbol = ']'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return RightBracket.symbol;
    }
    /**
     * Create new `RightBracket` token with range inside
     * the given `Line` at the given `column number`.
     */
    static newOnLine(line, atColumnNumber) {
        const { range } = line;
        const startPosition = new Position(range.startLineNumber, atColumnNumber);
        const endPosition = new Position(range.startLineNumber, atColumnNumber + this.symbol.length);
        return new RightBracket(Range.fromPositions(startPosition, endPosition));
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `right-bracket${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb2RlY3Mvc2ltcGxlQ29kZWMvdG9rZW5zL2JyYWNrZXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDL0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBR3JEOzs7R0FHRztBQUNILE1BQU0sT0FBTyxXQUFZLFNBQVEsU0FBUztJQUN6Qzs7T0FFRzthQUNvQixXQUFNLEdBQVcsR0FBRyxDQUFDO0lBRTVDOztPQUVHO0lBQ0gsSUFBVyxJQUFJO1FBQ2QsT0FBTyxXQUFXLENBQUMsTUFBTSxDQUFDO0lBQzNCLENBQUM7SUFFRDs7O09BR0c7SUFDSSxNQUFNLENBQUMsU0FBUyxDQUN0QixJQUFVLEVBQ1YsY0FBc0I7UUFFdEIsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQztRQUV2QixNQUFNLGFBQWEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQzFFLE1BQU0sV0FBVyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsY0FBYyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFN0YsT0FBTyxJQUFJLFdBQVcsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUN6QyxhQUFhLEVBQ2IsV0FBVyxDQUNYLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxlQUFlLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNwQyxDQUFDOztBQUdGOzs7R0FHRztBQUNILE1BQU0sT0FBTyxZQUFhLFNBQVEsU0FBUztJQUMxQzs7T0FFRzthQUNvQixXQUFNLEdBQVcsR0FBRyxDQUFDO0lBRTVDOztPQUVHO0lBQ0gsSUFBVyxJQUFJO1FBQ2QsT0FBTyxZQUFZLENBQUMsTUFBTSxDQUFDO0lBQzVCLENBQUM7SUFFRDs7O09BR0c7SUFDSSxNQUFNLENBQUMsU0FBUyxDQUN0QixJQUFVLEVBQ1YsY0FBc0I7UUFFdEIsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQztRQUV2QixNQUFNLGFBQWEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQzFFLE1BQU0sV0FBVyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsY0FBYyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFN0YsT0FBTyxJQUFJLFlBQVksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUMxQyxhQUFhLEVBQ2IsV0FBVyxDQUNYLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxnQkFBZ0IsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3JDLENBQUMifQ==