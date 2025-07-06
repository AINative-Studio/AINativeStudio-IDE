/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { Range } from '../../../core/range.js';
import { Position } from '../../../core/position.js';
/**
 * A token that represent a `<` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class LeftAngleBracket extends BaseToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '<'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return LeftAngleBracket.symbol;
    }
    /**
     * Create new `LeftBracket` token with range inside
     * the given `Line` at the given `column number`.
     */
    static newOnLine(line, atColumnNumber) {
        const { range } = line;
        const startPosition = new Position(range.startLineNumber, atColumnNumber);
        const endPosition = new Position(range.startLineNumber, atColumnNumber + this.symbol.length);
        return new LeftAngleBracket(Range.fromPositions(startPosition, endPosition));
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `left-angle-bracket${this.range}`;
    }
}
/**
 * A token that represent a `>` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class RightAngleBracket extends BaseToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '>'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return RightAngleBracket.symbol;
    }
    /**
     * Create new `RightAngleBracket` token with range inside
     * the given `Line` at the given `column number`.
     */
    static newOnLine(line, atColumnNumber) {
        const { range } = line;
        const startPosition = new Position(range.startLineNumber, atColumnNumber);
        const endPosition = new Position(range.startLineNumber, atColumnNumber + this.symbol.length);
        return new RightAngleBracket(Range.fromPositions(startPosition, endPosition));
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `right-angle-bracket${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5nbGVCcmFja2V0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29kZWNzL3NpbXBsZUNvZGVjL3Rva2Vucy9hbmdsZUJyYWNrZXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDL0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBR3JEOzs7R0FHRztBQUNILE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxTQUFTO0lBQzlDOztPQUVHO2FBQ29CLFdBQU0sR0FBVyxHQUFHLENBQUM7SUFFNUM7O09BRUc7SUFDSCxJQUFXLElBQUk7UUFDZCxPQUFPLGdCQUFnQixDQUFDLE1BQU0sQ0FBQztJQUNoQyxDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksTUFBTSxDQUFDLFNBQVMsQ0FDdEIsSUFBVSxFQUNWLGNBQXNCO1FBRXRCLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFFdkIsTUFBTSxhQUFhLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUMxRSxNQUFNLFdBQVcsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLGNBQWMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTdGLE9BQU8sSUFBSSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUM5QyxhQUFhLEVBQ2IsV0FBVyxDQUNYLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxxQkFBcUIsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzFDLENBQUM7O0FBR0Y7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGlCQUFrQixTQUFRLFNBQVM7SUFDL0M7O09BRUc7YUFDb0IsV0FBTSxHQUFXLEdBQUcsQ0FBQztJQUU1Qzs7T0FFRztJQUNILElBQVcsSUFBSTtRQUNkLE9BQU8saUJBQWlCLENBQUMsTUFBTSxDQUFDO0lBQ2pDLENBQUM7SUFFRDs7O09BR0c7SUFDSSxNQUFNLENBQUMsU0FBUyxDQUN0QixJQUFVLEVBQ1YsY0FBc0I7UUFFdEIsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQztRQUV2QixNQUFNLGFBQWEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQzFFLE1BQU0sV0FBVyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsY0FBYyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFN0YsT0FBTyxJQUFJLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxhQUFhLENBQy9DLGFBQWEsRUFDYixXQUFXLENBQ1gsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLHNCQUFzQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDM0MsQ0FBQyJ9