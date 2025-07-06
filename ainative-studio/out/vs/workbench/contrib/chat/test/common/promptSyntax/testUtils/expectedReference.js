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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwZWN0ZWRSZWZlcmVuY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC90ZXN0VXRpbHMvZXhwZWN0ZWRSZWZlcmVuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN6RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBK0MvRTs7R0FFRztBQUNILE1BQU0sT0FBTyxpQkFBaUI7SUFDN0IsWUFBNkIsT0FBa0M7UUFBbEMsWUFBTyxHQUFQLE9BQU8sQ0FBMkI7SUFBSSxDQUFDO0lBRXBFOztPQUVHO0lBQ0ksYUFBYSxDQUFDLEtBQXVCO1FBQzNDLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxlQUFlLEdBQUcsRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUMvRCxNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBRWhDOztXQUVHO1FBRUgsTUFBTSxDQUFDLFdBQVcsQ0FDakIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFDcEIsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUNkLEdBQUcsV0FBVyxtQkFBbUIsQ0FDakMsQ0FBQztRQUVGLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLEtBQUssQ0FBQyxJQUFJLEVBQ1YsSUFBSSxFQUNKLEdBQUcsV0FBVyxvQkFBb0IsQ0FDbEMsQ0FBQztRQUVGLE1BQU0sQ0FBQyxXQUFX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