/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { Range } from '../../../core/range.js';
import { Position } from '../../../core/position.js';
/**
 * A token that represent a `(` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class LeftParenthesis extends BaseToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '('; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return LeftParenthesis.symbol;
    }
    /**
     * Create new `LeftParenthesis` token with range inside
     * the given `Line` at the given `column number`.
     */
    static newOnLine(line, atColumnNumber) {
        const { range } = line;
        const startPosition = new Position(range.startLineNumber, atColumnNumber);
        const endPosition = new Position(range.startLineNumber, atColumnNumber + this.symbol.length);
        return new LeftParenthesis(Range.fromPositions(startPosition, endPosition));
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `left-parenthesis${this.range}`;
    }
}
/**
 * A token that represent a `)` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class RightParenthesis extends BaseToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = ')'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return RightParenthesis.symbol;
    }
    /**
     * Create new `RightParenthesis` token with range inside
     * the given `Line` at the given `column number`.
     */
    static newOnLine(line, atColumnNumber) {
        const { range } = line;
        const startPosition = new Position(range.startLineNumber, atColumnNumber);
        const endPosition = new Position(range.startLineNumber, atColumnNumber + this.symbol.length);
        return new RightParenthesis(Range.fromPositions(startPosition, endPosition));
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `right-parenthesis${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyZW50aGVzZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvZGVjcy9zaW1wbGVDb2RlYy90b2tlbnMvcGFyZW50aGVzZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFHckQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGVBQWdCLFNBQVEsU0FBUztJQUM3Qzs7T0FFRzthQUNvQixXQUFNLEdBQVcsR0FBRyxDQUFDO0lBRTVDOztPQUVHO0lBQ0gsSUFBVyxJQUFJO1FBQ2QsT0FBTyxlQUFlLENBQUMsTUFBTSxDQUFDO0lBQy9CLENBQUM7SUFFRDs7O09BR0c7SUFDSSxNQUFNLENBQUMsU0FBUyxDQUN0QixJQUFVLEVBQ1YsY0FBc0I7UUFFdEIsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQztRQUV2QixNQUFNLGFBQWEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQzFFLE1BQU0sV0FBVyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsY0FBYyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFN0YsT0FBTyxJQUFJLGVBQWUsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUM3QyxhQUFhLEVBQ2IsV0FBVyxDQUNYLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxtQkFBbUIsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3hDLENBQUM7O0FBR0Y7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGdCQUFpQixTQUFRLFNBQVM7SUFDOUM7O09BRUc7YUFDb0IsV0FBTSxHQUFXLEdBQUcsQ0FBQztJQUU1Qzs7T0FFRztJQUNILElBQVcsSUFBSTtRQUNkLE9BQU8sZ0JBQWdCLENBQUMsTUFBTSxDQUFDO0lBQ2hDLENBQUM7SUFFRDs7O09BR0c7SUFDSSxNQUFNLENBQUMsU0FBUyxDQUN0QixJQUFVLEVBQ1YsY0FBc0I7UUFFdEIsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQztRQUV2QixNQUFNLGFBQWEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQzFFLE1BQU0sV0FBVyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsY0FBYyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFN0YsT0FBTyxJQUFJLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxhQUFhLENBQzlDLGFBQWEsRUFDYixXQUFXLENBQ1gsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLG9CQUFvQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDekMsQ0FBQyJ9