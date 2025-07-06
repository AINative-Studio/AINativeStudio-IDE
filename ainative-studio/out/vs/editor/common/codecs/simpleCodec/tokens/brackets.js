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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvZGVjcy9zaW1wbGVDb2RlYy90b2tlbnMvYnJhY2tldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFHckQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLFdBQVksU0FBUSxTQUFTO0lBQ3pDOztPQUVHO2FBQ29CLFdBQU0sR0FBVyxHQUFHLENBQUM7SUFFNUM7O09BRUc7SUFDSCxJQUFXLElBQUk7UUFDZCxPQUFPLFdBQVcsQ0FBQyxNQUFNLENBQUM7SUFDM0IsQ0FBQztJQUVEOzs7T0FHRztJQUNJLE1BQU0sQ0FBQyxTQUFTLENBQ3RCLElBQVUsRUFDVixjQUFzQjtRQUV0QixNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBRXZCLE1BQU0sYUFBYSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDMUUsTUFBTSxXQUFXLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxjQUFjLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUU3RixPQUFPLElBQUksV0FBVyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQ3pDLGFBQWEsRUFDYixXQUFXLENBQ1gsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLGVBQWUsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3BDLENBQUM7O0FBR0Y7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLFlBQWEsU0FBUSxTQUFTO0lBQzFDOztPQUVHO2FBQ29CLFdBQU0sR0FBVyxHQUFHLENBQUM7SUFFNUM7O09BRUc7SUFDSCxJQUFXLElBQUk7UUFDZCxPQUFPLFlBQVksQ0FBQyxNQUFNLENBQUM7SUFDNUIsQ0FBQztJQUVEOzs7T0FHRztJQUNJLE1BQU0sQ0FBQyxTQUFTLENBQ3RCLElBQVUsRUFDVixjQUFzQjtRQUV0QixNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBRXZCLE1BQU0sYUFBYSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDMUUsTUFBTSxXQUFXLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxjQUFjLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUU3RixPQUFPLElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQzFDLGFBQWEsRUFDYixXQUFXLENBQ1gsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLGdCQUFnQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDckMsQ0FBQyJ9