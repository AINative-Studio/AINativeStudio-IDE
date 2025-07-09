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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwZWN0ZWRSZWZlcmVuY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvdGVzdFV0aWxzL2V4cGVjdGVkUmVmZXJlbmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUU1QixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDekUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQStDL0U7O0dBRUc7QUFDSCxNQUFNLE9BQU8saUJBQWlCO0lBQzdCLFlBQTZCLE9BQWtDO1FBQWxDLFlBQU8sR0FBUCxPQUFPLENBQTJCO0lBQUksQ0FBQztJQUVwRTs7T0FFRztJQUNJLGFBQWEsQ0FBQyxLQUF1QjtRQUMzQyxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsZUFBZSxHQUFHLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDL0QsTUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQztRQUVoQzs7V0FFRztRQUVILE1BQU0sQ0FBQyxXQUFXLENBQ2pCLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQ3BCLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFDZCxHQUFHLFdBQVcsbUJBQW1CLENBQ2pDLENBQUM7UUFFRixNQUFNLENBQUMsV0FBVyxDQUNqQixLQUFLLENBQUMsSUFBSSxFQUNWLElBQUksRUFDSixHQUFHLFdBQVcsb0JBQW9CLENBQ2xDLENBQUM7UUFFRixNQUFNLENBQUMsV0FB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