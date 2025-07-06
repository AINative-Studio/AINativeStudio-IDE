/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { Range } from '../../../core/range.js';
import { Position } from '../../../core/position.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
/**
 * Token that represent a `carriage return` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class CarriageReturn extends BaseToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '\r'; }
    /**
     * The byte representation of the {@link symbol}.
     */
    static { this.byte = VSBuffer.fromString(CarriageReturn.symbol); }
    /**
     * The byte representation of the token.
     */
    get byte() {
        return CarriageReturn.byte;
    }
    /**
     * Return text representation of the token.
     */
    get text() {
        return CarriageReturn.symbol;
    }
    /**
     * Create new `CarriageReturn` token with range inside
     * the given `Line` at the given `column number`.
     */
    static newOnLine(line, atColumnNumber) {
        const { range } = line;
        const startPosition = new Position(range.startLineNumber, atColumnNumber);
        const endPosition = new Position(range.startLineNumber, atColumnNumber + this.symbol.length);
        return new CarriageReturn(Range.fromPositions(startPosition, endPosition));
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `carriage-return${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FycmlhZ2VSZXR1cm4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvZGVjcy9saW5lc0NvZGVjL3Rva2Vucy9jYXJyaWFnZVJldHVybi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDL0MsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQy9DLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFaEU7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGNBQWUsU0FBUSxTQUFTO0lBQzVDOztPQUVHO2FBQ29CLFdBQU0sR0FBVyxJQUFJLENBQUM7SUFFN0M7O09BRUc7YUFDb0IsU0FBSSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBRXpFOztPQUVHO0lBQ0gsSUFBVyxJQUFJO1FBQ2QsT0FBTyxjQUFjLENBQUMsSUFBSSxDQUFDO0lBQzVCLENBQUM7SUFFRDs7T0FFRztJQUNILElBQVcsSUFBSTtRQUNkLE9BQU8sY0FBYyxDQUFDLE1BQU0sQ0FBQztJQUM5QixDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksTUFBTSxDQUFDLFNBQVMsQ0FDdEIsSUFBVSxFQUNWLGNBQXNCO1FBRXRCLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFFdkIsTUFBTSxhQUFhLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUMxRSxNQUFNLFdBQVcsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLGNBQWMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTdGLE9BQU8sSUFBSSxjQUFjLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FDNUMsYUFBYSxFQUNiLFdBQVcsQ0FDWCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDYSxRQUFRO1FBQ3ZCLE9BQU8sa0JBQWtCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN2QyxDQUFDIn0=