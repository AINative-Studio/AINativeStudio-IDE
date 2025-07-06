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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi90eXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRXJDOztHQUVHO0FBQ0gsTUFBTSxVQUFVLFFBQVEsQ0FBQyxHQUFZO0lBQ3BDLE9BQU8sQ0FBQyxPQUFPLEdBQUcsS0FBSyxRQUFRLENBQUMsQ0FBQztBQUNsQyxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsYUFBYSxDQUFDLEtBQWM7SUFDM0MsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFnQixLQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDakYsQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sVUFBVSxRQUFRLENBQUMsR0FBWTtJQUNwQyw0RUFBNEU7SUFDNUUsOEVBQThFO0lBQzlFLHNDQUFzQztJQUN0QyxPQUFPLE9BQU8sR0FBRyxLQUFLLFFBQVE7V0FDMUIsR0FBRyxLQUFLLElBQUk7V0FDWixDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO1dBQ25CLENBQUMsQ0FBQyxHQUFHLFlBQVksTUFBTSxDQUFDO1dBQ3hCLENBQUMsQ0FBQyxHQUFHLFlBQVksSUFBSSxDQUFDLENBQUM7QUFDNUIsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLFlBQVksQ0FBQyxHQUFZO0lBQ3hDLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDckQsT0FBTyxPQUFPLEdBQUcsS0FBSyxRQUFRO1dBQzFCLEdBQUcsWUFBWSxV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