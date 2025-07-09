/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assert } from '../../../../base/common/assert.js';
/**
 * An abstract parser class that is able to parse a sequence of
 * tokens into a new single entity.
 */
export class ParserBase {
    constructor(
    /**
     * Set of tokens that were accumulated so far.
     */
    currentTokens = []) {
        this.currentTokens = currentTokens;
        /**
         * Whether the parser object was "consumed" and should not be used anymore.
         */
        this.isConsumed = false;
        this.startTokensCount = this.currentTokens.length;
    }
    /**
     * Get the tokens that were accumulated so far.
     */
    get tokens() {
        return this.currentTokens;
    }
    /**
     * A helper method that validates that the current parser object was not yet consumed,
     * hence can still be used to accept new tokens in the parsing process.
     *
     * @throws if the parser object is already consumed.
     */
    assertNotConsumed() {
        assert(this.isConsumed === false, `The parser object is already consumed and should not be used anymore.`);
    }
}
/**
 * Decorator that validates that the current parser object was not yet consumed,
 * hence can still be used to accept new tokens in the parsing process.
 *
 * @throws the resulting decorated method throws if the parser object was already consumed.
 */
export function assertNotConsumed(_target, propertyKey, descriptor) {
    // store the original method reference
    const originalMethod = descriptor.value;
    // validate that the current parser object was not yet consumed
    // before invoking the original accept method
    descriptor.value = function (...args) {
        assert(this.isConsumed === false, `The parser object is already consumed and should not be used anymore.`);
        return originalMethod.apply(this, args);
    };
    return descriptor;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyQmFzZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvZGVjcy9zaW1wbGVDb2RlYy9wYXJzZXJCYXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQXVDM0Q7OztHQUdHO0FBQ0gsTUFBTSxPQUFnQixVQUFVO0lBVy9CO0lBQ0M7O09BRUc7SUFDZ0IsZ0JBQTBCLEVBQUU7UUFBNUIsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFkaEQ7O1dBRUc7UUFDTyxlQUFVLEdBQVksS0FBSyxDQUFDO1FBYXJDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztJQUNuRCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFXLE1BQU07UUFDaEIsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDO0lBQzNCLENBQUM7SUFZRDs7Ozs7T0FLRztJQUNPLGlCQUFpQjtRQUMxQixNQUFNLENBQ0wsSUFBSSxDQUFDLFVBQVUsS0FBSyxLQUFLLEVBQ3pCLHVFQUF1RSxDQUN2RSxDQUFDO0lBQ0gsQ0FBQztDQUNEO0FBRUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsaUJBQWlCLENBQ2hDLE9BQVUsRUFDVixXQUFxQixFQUNyQixVQUE4QjtJQUU5QixzQ0FBc0M7SUFDdEMsTUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQztJQUV4QywrREFBK0Q7SUFDL0QsNkNBQTZDO0lBQzdDLFVBQVUsQ0FBQyxLQUFLLEdBQUcsVUFFbEIsR0FBRyxJQUF1QztRQUUxQyxNQUFNLENBQ0wsSUFBSSxDQUFDLFVBQVUsS0FBSyxLQUFLLEVBQ3pCLHVFQUF1RSxDQUN2RSxDQUFDO1FBRUYsT0FBTyxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN6QyxDQUFDLENBQUM7SUFFRixPQUFPLFVBQVUsQ0FBQztBQUNuQixDQUFDIn0=