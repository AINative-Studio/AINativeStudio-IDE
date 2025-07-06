/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Range } from '../../../../../../../editor/common/core/range.js';
import { assertDefined } from '../../../../../../../base/common/types.js';
import { ResolveError } from '../../../../common/promptFileReferenceErrors.js';
/**
 * An expected child reference to use in tests.
 */
export class ExpectedReference {
    constructor(options) {
        this.options = options;
    }
    /**
     * Validate that the provided reference is equal to this object.
     */
    validateEqual(other) {
        const { uri, text, path, childrenOrError = [] } = this.options;
        const errorPrefix = `[${uri}] `;
        /**
         * Validate the base properties of the reference first.
         */
        assert.strictEqual(other.uri.toString(), uri.toString(), `${errorPrefix} Incorrect 'uri'.`);
        assert.strictEqual(other.text, text, `${errorPrefix} Incorrect 'text'.`);
        assert.strictEqual(other.path, path, `${errorPrefix} Incorrect 'path'.`);
        const range = new Range(this.options.startLine, this.options.startColumn, this.options.startLine, this.options.startColumn + text.length);
        assert(range.equalsRange(other.range), `${errorPrefix} Incorrect 'range': expected '${range}', got '${other.range}'.`);
        if (path.length) {
            assertDefined(other.linkRange, `${errorPrefix} Link range must be defined.`);
            const linkRange = new Range(this.options.startLine, this.options.pathStartColumn, this.options.startLine, this.options.pathStartColumn + path.length);
            assert(linkRange.equalsRange(other.linkRange), `${errorPrefix} Incorrect 'linkRange': expected '${linkRange}', got '${other.linkRange}'.`);
        }
        else {
            assert.strictEqual(other.linkRange, undefined, `${errorPrefix} Link range must be 'undefined'.`);
        }
        /**
         * Next validate children or error condition.
         */
        if (childrenOrError instanceof ResolveError) {
            const error = childrenOrError;
            const { errorCondition } = other;
            assertDefined(errorCondition, `${errorPrefix} Expected 'errorCondition' to be defined.`);
            assert(errorCondition instanceof ResolveError, `${errorPrefix} Expected 'errorCondition' to be a 'ResolveError'.`);
            assert(error.sameTypeAs(errorCondition), `${errorPrefix} Incorrect 'errorCondition' type.`);
            return;
        }
        const children = childrenOrError;
        const { references } = other;
        for (let i = 0; i < children.length; i++) {
            const reference = references[i];
            assertDefined(reference, `${errorPrefix} Expected reference #${i} be ${children[i]}, got 'undefined'.`);
            children[i].validateEqual(reference);
        }
        if (references.length > children.length) {
            const extraReference = references[children.length];
            // sanity check
            assertDefined(extraReference, `${errorPrefix} Extra reference must be defined.`);
            throw new Error(`${errorPrefix} Expected no more references, got '${extraReference.text}'.`);
        }
        if (children.length > references.length) {
            const expectedReference = children[references.length];
            // sanity check
            assertDefined(expectedReference, `${errorPrefix} Expected reference must be defined.`);
            throw new Error(`${errorPrefix} Expected another reference '${expectedReference.options.text}', got 'undefined'.`);
        }
    }
    /**
     * Returns a string representation of the reference.
     */
    toString() {
        return `expected-reference/${this.options.text}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwZWN0ZWRSZWZlcmVuY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L3Rlc3RVdGlscy9leHBlY3RlZFJlZmVyZW5jZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saURBQWlELENBQUM7QUErQy9FOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGlCQUFpQjtJQUM3QixZQUE2QixPQUFrQztRQUFsQyxZQUFPLEdBQVAsT0FBTyxDQUEyQjtJQUFJLENBQUM7SUFFcEU7O09BRUc7SUFDSSxhQUFhLENBQUMsS0FBdUI7UUFDM0MsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLGVBQWUsR0FBRyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQy9ELE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxJQUFJLENBQUM7UUFFaEM7O1dBRUc7UUFFSCxNQUFNLENBQUMsV0FBVyxDQUNqQixLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUNwQixHQUFHLENBQUMsUUFBUSxFQUFFLEVBQ2QsR0FBRyxXQUFXLG1CQUFtQixDQUNqQyxDQUFDO1FBRUYsTUFBTSxDQUFDLFdBQVcsQ0FDakIsS0FBSyxDQUFDLElBQUksRUFDVixJQUFJLEVBQ0osR0FBRyxXQUFXLG9CQUFvQixDQUNsQyxDQUFDO1FBRUYsTUFBTSxDQUFD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