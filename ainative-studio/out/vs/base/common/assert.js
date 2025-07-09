/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError, onUnexpectedError } from './errors.js';
/**
 * Throws an error with the provided message if the provided value does not evaluate to a true Javascript value.
 *
 * @deprecated Use `assert(...)` instead.
 * This method is usually used like this:
 * ```ts
 * import * as assert from 'vs/base/common/assert';
 * assert.ok(...);
 * ```
 *
 * However, `assert` in that example is a user chosen name.
 * There is no tooling for generating such an import statement.
 * Thus, the `assert(...)` function should be used instead.
 */
export function ok(value, message) {
    if (!value) {
        throw new Error(message ? `Assertion failed (${message})` : 'Assertion Failed');
    }
}
export function assertNever(value, message = 'Unreachable') {
    throw new Error(message);
}
/**
 * Asserts that a condition is `truthy`.
 *
 * @throws provided {@linkcode messageOrError} if the {@linkcode condition} is `falsy`.
 *
 * @param condition The condition to assert.
 * @param messageOrError An error message or error object to throw if condition is `falsy`.
 */
export function assert(condition, messageOrError = 'unexpected state') {
    if (!condition) {
        // if error instance is provided, use it, otherwise create a new one
        const errorToThrow = typeof messageOrError === 'string'
            ? new BugIndicatingError(`Assertion Failed: ${messageOrError}`)
            : messageOrError;
        throw errorToThrow;
    }
}
/**
 * Like assert, but doesn't throw.
 */
export function softAssert(condition, message = 'Soft Assertion Failed') {
    if (!condition) {
        onUnexpectedError(new BugIndicatingError(message));
    }
}
/**
 * condition must be side-effect free!
 */
export function assertFn(condition) {
    if (!condition()) {
        // eslint-disable-next-line no-debugger
        debugger;
        // Reevaluate `condition` again to make debugging easier
        condition();
        onUnexpectedError(new BugIndicatingError('Assertion Failed'));
    }
}
export function checkAdjacentItems(items, predicate) {
    let i = 0;
    while (i < items.length - 1) {
        const a = items[i];
        const b = items[i + 1];
        if (!predicate(a, b)) {
            return false;
        }
        i++;
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2Fzc2VydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFFcEU7Ozs7Ozs7Ozs7Ozs7R0FhRztBQUNILE1BQU0sVUFBVSxFQUFFLENBQUMsS0FBZSxFQUFFLE9BQWdCO0lBQ25ELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDakYsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsV0FBVyxDQUFDLEtBQVksRUFBRSxPQUFPLEdBQUcsYUFBYTtJQUNoRSxNQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzFCLENBQUM7QUFFRDs7Ozs7OztHQU9HO0FBQ0gsTUFBTSxVQUFVLE1BQU0sQ0FDckIsU0FBa0IsRUFDbEIsaUJBQWlDLGtCQUFrQjtJQUVuRCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDaEIsb0VBQW9FO1FBQ3BFLE1BQU0sWUFBWSxHQUFHLE9BQU8sY0FBYyxLQUFLLFFBQVE7WUFDdEQsQ0FBQyxDQUFDLElBQUksa0JBQWtCLENBQUMscUJBQXFCLGNBQWMsRUFBRSxDQUFDO1lBQy9ELENBQUMsQ0FBQyxjQUFjLENBQUM7UUFFbEIsTUFBTSxZQUFZLENBQUM7SUFDcEIsQ0FBQztBQUNGLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxVQUFVLENBQUMsU0FBa0IsRUFBRSxPQUFPLEdBQUcsdUJBQXVCO0lBQy9FLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNoQixpQkFBaUIsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDcEQsQ0FBQztBQUNGLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxRQUFRLENBQUMsU0FBd0I7SUFDaEQsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUM7UUFDbEIsdUNBQXVDO1FBQ3ZDLFFBQVEsQ0FBQztRQUNULHdEQUF3RDtRQUN4RCxTQUFTLEVBQUUsQ0FBQztRQUNaLGlCQUFpQixDQUFDLElBQUksa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO0lBQy9ELENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLGtCQUFrQixDQUFJLEtBQW1CLEVBQUUsU0FBMEM7SUFDcEcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ1YsT0FBTyxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUM3QixNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkIsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN2QixJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3RCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUNELENBQUMsRUFBRSxDQUFDO0lBQ0wsQ0FBQztJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2IsQ0FBQyJ9