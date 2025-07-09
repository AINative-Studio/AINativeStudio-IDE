/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownToken } from './markdownToken.js';
import { assert } from '../../../../../base/common/assert.js';
/**
 * A token that represent a `markdown comment` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class MarkdownComment extends MarkdownToken {
    constructor(range, text) {
        assert(text.startsWith('<!--'), `The comment must start with '<!--', got '${text.substring(0, 10)}'.`);
        super(range);
        this.text = text;
    }
    /**
     * Whether the comment has an end comment marker `-->`.
     */
    get hasEndMarker() {
        return this.text.endsWith('-->');
    }
    /**
     * Check if this token is equal to another one.
     */
    equals(other) {
        if (!super.sameRange(other.range)) {
            return false;
        }
        if (!(other instanceof MarkdownComment)) {
            return false;
        }
        return this.text === other.text;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `md-comment("${this.text}")${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25Db21tZW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29kZWNzL21hcmtkb3duQ29kZWMvdG9rZW5zL21hcmtkb3duQ29tbWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDbkQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRTlEOzs7R0FHRztBQUNILE1BQU0sT0FBTyxlQUFnQixTQUFRLGFBQWE7SUFDakQsWUFDQyxLQUFZLEVBQ0ksSUFBWTtRQUU1QixNQUFNLENBQ0wsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFDdkIsNENBQTRDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQ3JFLENBQUM7UUFFRixLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFQRyxTQUFJLEdBQUosSUFBSSxDQUFRO0lBUTdCLENBQUM7SUFFRDs7T0FFRztJQUNILElBQVcsWUFBWTtRQUN0QixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFRDs7T0FFRztJQUNhLE1BQU0sQ0FBc0IsS0FBUTtRQUNuRCxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNuQyxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxJQUFJLENBQUMsQ0FBQyxLQUFLLFlBQVksZUFBZSxDQUFDLEVBQUUsQ0FBQztZQUN6QyxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDLElBQUksQ0FBQztJQUNqQyxDQUFDO0lBRUQ7O09BRUc7SUFDYSxRQUFRO1FBQ3ZCLE9BQU8sZUFBZSxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNsRCxDQUFDO0NBQ0QifQ==