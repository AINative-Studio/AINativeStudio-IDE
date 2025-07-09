/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assert } from './assert.js';
/**
 * @returns whether the provided parameter is a JavaScript String or not.
 */
export function isString(str) {
    return (typeof str === 'string');
}
/**
 * @returns whether the provided parameter is a JavaScript Array and each element in the array is a string.
 */
export function isStringArray(value) {
    return Array.isArray(value) && value.every(elem => isString(elem));
}
/**
 * @returns whether the provided parameter is of type `object` but **not**
 *	`null`, an `array`, a `regexp`, nor a `date`.
 */
export function isObject(obj) {
    // The method can't do a type cast since there are type (like strings) which
    // are subclasses of any put not positvely matched by the function. Hence type
    // narrowing results in wrong results.
    return typeof obj === 'object'
        && obj !== null
        && !Array.isArray(obj)
        && !(obj instanceof RegExp)
        && !(obj instanceof Date);
}
/**
 * @returns whether the provided parameter is of type `Buffer` or Uint8Array dervived type
 */
export function isTypedArray(obj) {
    const TypedArray = Object.getPrototypeOf(Uint8Array);
    return typeof obj === 'object'
        && obj instanceof TypedArray;
}
/**
 * In **contrast** to just checking `typeof` this will return `false` for `NaN`.
 * @returns whether the provided parameter is a JavaScript Number or not.
 */
export function isNumber(obj) {
    return (typeof obj === 'number' && !isNaN(obj));
}
/**
 * @returns whether the provided parameter is an Iterable, casting to the given generic
 */
export function isIterable(obj) {
    return !!obj && typeof obj[Symbol.iterator] === 'function';
}
/**
 * @returns whether the provided parameter is a JavaScript Boolean or not.
 */
export function isBoolean(obj) {
    return (obj === true || obj === false);
}
/**
 * @returns whether the provided parameter is undefined.
 */
export function isUndefined(obj) {
    return (typeof obj === 'undefined');
}
/**
 * @returns whether the provided parameter is defined.
 */
export function isDefined(arg) {
    return !isUndefinedOrNull(arg);
}
/**
 * @returns whether the provided parameter is undefined or null.
 */
export function isUndefinedOrNull(obj) {
    return (isUndefined(obj) || obj === null);
}
export function assertType(condition, type) {
    if (!condition) {
        throw new Error(type ? `Unexpected type, expected '${type}'` : 'Unexpected type');
    }
}
/**
 * Asserts that the argument passed in is neither undefined nor null.
 *
 * @see {@link assertDefined} for a similar utility that leverages TS assertion functions to narrow down the type of `arg` to be non-nullable.
 */
export function assertIsDefined(arg) {
    assert(arg !== null && arg !== undefined, 'Argument is `undefined` or `null`.');
    return arg;
}
/**
 * Asserts that a provided `value` is `defined` - not `null` or `undefined`,
 * throwing an error with the provided error or error message, while also
 * narrowing down the type of the `value` to be `NonNullable` using TS
 * assertion functions.
 *
 * @throws if the provided `value` is `null` or `undefined`.
 *
 * ## Examples
 *
 * ```typescript
 * // an assert with an error message
 * assertDefined('some value', 'String constant is not defined o_O.');
 *
 * // `throws!` the provided error
 * assertDefined(null, new Error('Should throw this error.'));
 *
 * // narrows down the type of `someValue` to be non-nullable
 * const someValue: string | undefined | null = blackbox();
 * assertDefined(someValue, 'Some value must be defined.');
 * console.log(someValue.length); // now type of `someValue` is `string`
 * ```
 *
 * @see {@link assertIsDefined} for a similar utility but without assertion.
 * @see {@link https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions typescript-3-7.html#assertion-functions}
 */
export function assertDefined(value, error) {
    if (value === null || value === undefined) {
        const errorToThrow = typeof error === 'string' ? new Error(error) : error;
        throw errorToThrow;
    }
}
export function assertAllDefined(...args) {
    const result = [];
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (isUndefinedOrNull(arg)) {
            throw new Error(`Assertion Failed: argument at index ${i} is undefined or null`);
        }
        result.push(arg);
    }
    return result;
}
/**
 * Asserts that the provided `item` is one of the items in the `list`.
 * Helps to narrow down broader `TType` of the `item` to the more
 * specific `TSubtype` type.
 *
 * ## Examples
 *
 * ```typescript
 * // note! item type is a `subset of string`
 * type TItem = ':' | '.' | '/';
 *
 * // note! item is type of `string` here
 * const item: string = ':';
 * // list of the items to check against
 * const list: TItem[] = [':', '.'];
 *
 * // ok
 * assertOneOf(
 *   item,
 *   list,
 *   'Must succeed',
 * );
 *
 * // `item` is of `TItem` type now
 * ```
 */
export function assertOneOf(item, list, errorPrefix) {
    // note! it's ok to type cast here because `TSubtype` is a subtype of `TType`
    assert(list.includes(item), `${errorPrefix}: Expected '${item}' to be one of [${list.join(', ')}].`);
}
/**
 * Compile-time type check of a variable.
 */
export function typeCheck(_thing) { }
const hasOwnProperty = Object.prototype.hasOwnProperty;
/**
 * @returns whether the provided parameter is an empty JavaScript Object or not.
 */
export function isEmptyObject(obj) {
    if (!isObject(obj)) {
        return false;
    }
    for (const key in obj) {
        if (hasOwnProperty.call(obj, key)) {
            return false;
        }
    }
    return true;
}
/**
 * @returns whether the provided parameter is a JavaScript Function or not.
 */
export function isFunction(obj) {
    return (typeof obj === 'function');
}
/**
 * @returns whether the provided parameters is are JavaScript Function or not.
 */
export function areFunctions(...objects) {
    return objects.length > 0 && objects.every(isFunction);
}
export function validateConstraints(args, constraints) {
    const len = Math.min(args.length, constraints.length);
    for (let i = 0; i < len; i++) {
        validateConstraint(args[i], constraints[i]);
    }
}
export function validateConstraint(arg, constraint) {
    if (isString(constraint)) {
        if (typeof arg !== constraint) {
            throw new Error(`argument does not match constraint: typeof ${constraint}`);
        }
    }
    else if (isFunction(constraint)) {
        try {
            if (arg instanceof constraint) {
                return;
            }
        }
        catch {
            // ignore
        }
        if (!isUndefinedOrNull(arg) && arg.constructor === constraint) {
            return;
        }
        if (constraint.length === 1 && constraint.call(undefined, arg) === true) {
            return;
        }
        throw new Error(`argument does not match one of these constraints: arg instanceof constraint, arg.constructor === constraint, nor constraint(arg) === true`);
    }
}
/**
 * Helper type assertion that safely upcasts a type to a supertype.
 *
 * This can be used to make sure the argument correctly conforms to the subtype while still being able to pass it
 * to contexts that expects the supertype.
 */
export function upcast(x) {
    return x;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vdHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUVyQzs7R0FFRztBQUNILE1BQU0sVUFBVSxRQUFRLENBQUMsR0FBWTtJQUNwQyxPQUFPLENBQUMsT0FBTyxHQUFHLEtBQUssUUFBUSxDQUFDLENBQUM7QUFDbEMsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGFBQWEsQ0FBQyxLQUFjO0lBQzNDLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBZ0IsS0FBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ2pGLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsUUFBUSxDQUFDLEdBQVk7SUFDcEMsNEVBQTRFO0lBQzVFLDhFQUE4RTtJQUM5RSxzQ0FBc0M7SUFDdEMsT0FBTyxPQUFPLEdBQUcsS0FBSyxRQUFRO1dBQzFCLEdBQUcsS0FBSyxJQUFJO1dBQ1osQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQztXQUNuQixDQUFDLENBQUMsR0FBRyxZQUFZLE1BQU0sQ0FBQztXQUN4QixDQUFDLENBQUMsR0FBRyxZQUFZLElBQUksQ0FBQyxDQUFDO0FBQzVCLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxZQUFZLENBQUMsR0FBWTtJQUN4QyxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3JELE9BQU8sT0FBTyxHQUFHLEtBQUssUUFBUTtXQUMxQixHQUFHLFlBQVks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