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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb2RlY3MvbGluZXNDb2RlYy90b2tlbnMvbGluZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDL0MsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUVuRTs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sSUFBSyxTQUFRLFNBQVM7SUFDbEM7SUFDQyxpQkFBaUI7SUFDakIseUJBQXlCO0lBQ3pCLFVBQWtCO0lBQ2xCLG9CQUFvQjtJQUNKLElBQVk7UUFFNUIsTUFBTSxDQUNMLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUNsQixvQ0FBb0MsQ0FDcEMsQ0FBQztRQUVGLE1BQU0sQ0FDTCxVQUFVLEdBQUcsQ0FBQyxFQUNkLHNDQUFzQyxVQUFVLElBQUksQ0FDcEQsQ0FBQztRQUVGLEtBQUssQ0FDSixJQUFJLEtBQUssQ0FDUixVQUFVLEVBQ1YsQ0FBQyxFQUNELFVBQVUsRUFDVixJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FDZixDQUNELENBQUM7UUFuQmMsU0FBSSxHQUFKLElBQUksQ0FBUTtJQW9CN0IsQ0FBQztJQUVEOztPQUVHO0lBQ2EsTUFBTSxDQUFzQixLQUFRO1FBQ25ELElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDMUIsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsSUFBSSxDQUFDLENBQUMsS0FBSyxZQUFZLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDOUIsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFDakMsQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLFNBQVMsSUFBSSxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDNUMsQ0FBQztDQUNEIn0=