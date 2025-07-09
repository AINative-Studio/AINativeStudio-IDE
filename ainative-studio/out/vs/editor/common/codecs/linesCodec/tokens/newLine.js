/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { Position } from '../../../../../editor/common/core/position.js';
/**
 * A token that represent a `new line` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class NewLine extends BaseToken {
    /**
     * The underlying symbol of the `NewLine` token.
     */
    static { this.symbol = '\n'; }
    /**
     * The byte representation of the {@link symbol}.
     */
    static { this.byte = VSBuffer.fromString(NewLine.symbol); }
    /**
     * Return text representation of the token.
     */
    get text() {
        return NewLine.symbol;
    }
    /**
     * The byte representation of the token.
     */
    get byte() {
        return NewLine.byte;
    }
    /**
     * Create new `NewLine` token with range inside
     * the given `Line` at the given `column number`.
     */
    static newOnLine(line, atColumnNumber) {
        const { range } = line;
        const startPosition = new Position(range.startLineNumber, atColumnNumber);
        const endPosition = new Position(range.startLineNumber, atColumnNumber + this.symbol.length);
        return new NewLine(Range.fromPositions(startPosition, endPosition));
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `newline${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV3TGluZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvZGVjcy9saW5lc0NvZGVjL3Rva2Vucy9uZXdMaW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUV6RTs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sT0FBUSxTQUFRLFNBQVM7SUFDckM7O09BRUc7YUFDb0IsV0FBTSxHQUFXLElBQUksQ0FBQztJQUU3Qzs7T0FFRzthQUNvQixTQUFJLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7SUFFbEU7O09BRUc7SUFDSCxJQUFXLElBQUk7UUFDZCxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUM7SUFDdkIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBVyxJQUFJO1FBQ2QsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDO0lBQ3JCLENBQUM7SUFFRDs7O09BR0c7SUFDSSxNQUFNLENBQUMsU0FBUyxDQUN0QixJQUFVLEVBQ1YsY0FBc0I7UUFFdEIsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQztRQUV2QixNQUFNLGFBQWEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQzFFLE1BQU0sV0FBVyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsY0FBYyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFN0YsT0FBTyxJQUFJLE9BQU8sQ0FDakIsS0FBSyxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQy9DLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDYSxRQUFRO1FBQ3ZCLE9BQU8sVUFBVSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDL0IsQ0FBQyJ9