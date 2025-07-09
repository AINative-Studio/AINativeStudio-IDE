/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownToken } from './markdownToken.js';
import { Range } from '../../../core/range.js';
import { assert } from '../../../../../base/common/assert.js';
/**
 * A token that represent a `markdown link` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class MarkdownLink extends MarkdownToken {
    constructor(
    /**
     * The starting line number of the link (1-based indexing).
     */
    lineNumber, 
    /**
     * The starting column number of the link (1-based indexing).
     */
    columnNumber, 
    /**
     * The caption of the original link, including the square brackets.
     */
    caption, 
    /**
     * The reference of the original link, including the parentheses.
     */
    reference) {
        assert(!isNaN(lineNumber), `The line number must not be a NaN.`);
        assert(lineNumber > 0, `The line number must be >= 1, got "${lineNumber}".`);
        assert(columnNumber > 0, `The column number must be >= 1, got "${columnNumber}".`);
        assert(caption[0] === '[' && caption[caption.length - 1] === ']', `The caption must be enclosed in square brackets, got "${caption}".`);
        assert(reference[0] === '(' && reference[reference.length - 1] === ')', `The reference must be enclosed in parentheses, got "${reference}".`);
        super(new Range(lineNumber, columnNumber, lineNumber, columnNumber + caption.length + reference.length));
        this.caption = caption;
        this.reference = reference;
        // set up the `isURL` flag based on the current
        try {
            new URL(this.path);
            this.isURL = true;
        }
        catch {
            this.isURL = false;
        }
    }
    get text() {
        return `${this.caption}${this.reference}`;
    }
    /**
     * Returns the `reference` part of the link without enclosing parentheses.
     */
    get path() {
        return this.reference.slice(1, this.reference.length - 1);
    }
    /**
     * Check if this token is equal to another one.
     */
    equals(other) {
        if (!super.sameRange(other.range)) {
            return false;
        }
        if (!(other instanceof MarkdownLink)) {
            return false;
        }
        return this.text === other.text;
    }
    /**
     * Get the range of the `link part` of the token.
     */
    get linkRange() {
        if (this.path.length === 0) {
            return undefined;
        }
        const { range } = this;
        // note! '+1' for openning `(` of the link
        const startColumn = range.startColumn + this.caption.length + 1;
        const endColumn = startColumn + this.path.length;
        return new Range(range.startLineNumber, startColumn, range.endLineNumber, endColumn);
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `md-link("${this.text}")${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25MaW5rLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29kZWNzL21hcmtkb3duQ29kZWMvdG9rZW5zL21hcmtkb3duTGluay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDbkQsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUU5RDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sWUFBYSxTQUFRLGFBQWE7SUFNOUM7SUFDQzs7T0FFRztJQUNILFVBQWtCO0lBQ2xCOztPQUVHO0lBQ0gsWUFBb0I7SUFDcEI7O09BRUc7SUFDYSxPQUFlO0lBQy9COztPQUVHO0lBQ2EsU0FBaUI7UUFFakMsTUFBTSxDQUNMLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUNsQixvQ0FBb0MsQ0FDcEMsQ0FBQztRQUVGLE1BQU0sQ0FDTCxVQUFVLEdBQUcsQ0FBQyxFQUNkLHNDQUFzQyxVQUFVLElBQUksQ0FDcEQsQ0FBQztRQUVGLE1BQU0sQ0FDTCxZQUFZLEdBQUcsQ0FBQyxFQUNoQix3Q0FBd0MsWUFBWSxJQUFJLENBQ3hELENBQUM7UUFFRixNQUFNLENBQ0wsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQ3pELHlEQUF5RCxPQUFPLElBQUksQ0FDcEUsQ0FBQztRQUVGLE1BQU0sQ0FDTCxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFDL0QsdURBQXVELFNBQVMsSUFBSSxDQUNwRSxDQUFDO1FBRUYsS0FBSyxDQUNKLElBQUksS0FBSyxDQUNSLFVBQVUsRUFDVixZQUFZLEVBQ1osVUFBVSxFQUNWLFlBQVksR0FBRyxPQUFPLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQ2hELENBQ0QsQ0FBQztRQXRDYyxZQUFPLEdBQVAsT0FBTyxDQUFRO1FBSWYsY0FBUyxHQUFULFNBQVMsQ0FBUTtRQW9DakMsK0NBQStDO1FBQy9DLElBQUksQ0FBQztZQUNKLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNuQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztRQUNuQixDQUFDO1FBQUMsTUFBTSxDQUFDO1lBQ1IsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDcEIsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFvQixJQUFJO1FBQ3ZCLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUMzQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFXLElBQUk7UUFDZCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRUQ7O09BRUc7SUFDYSxNQUFNLENBQXNCLEtBQVE7UUFDbkQsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDbkMsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsSUFBSSxDQUFDLENBQUMsS0FBSyxZQUFZLFlBQVksQ0FBQyxFQUFFLENBQUM7WUFDdEMsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFDakMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBVyxTQUFTO1FBQ25CLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDNUIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFFdkIsMENBQTBDO1FBQzFDLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ2hFLE1BQU0sU0FBUyxHQUFHLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUVqRCxPQUFPLElBQUksS0FBSyxDQUNmLEtBQUssQ0FBQyxlQUFlLEVBQ3JCLFdBQVcsRUFDWCxLQUFLLENBQUMsYUFBYSxFQUNuQixTQUFTLENBQ1QsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxZQUFZLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQy9DLENBQUM7Q0FDRCJ9