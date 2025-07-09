/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isTypedArray, isObject, isUndefinedOrNull } from './types.js';
export function deepClone(obj) {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }
    if (obj instanceof RegExp) {
        return obj;
    }
    const result = Array.isArray(obj) ? [] : {};
    Object.entries(obj).forEach(([key, value]) => {
        result[key] = value && typeof value === 'object' ? deepClone(value) : value;
    });
    return result;
}
export function deepFreeze(obj) {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }
    const stack = [obj];
    while (stack.length > 0) {
        const obj = stack.shift();
        Object.freeze(obj);
        for (const key in obj) {
            if (_hasOwnProperty.call(obj, key)) {
                const prop = obj[key];
                if (typeof prop === 'object' && !Object.isFrozen(prop) && !isTypedArray(prop)) {
                    stack.push(prop);
                }
            }
        }
    }
    return obj;
}
const _hasOwnProperty = Object.prototype.hasOwnProperty;
export function cloneAndChange(obj, changer) {
    return _cloneAndChange(obj, changer, new Set());
}
function _cloneAndChange(obj, changer, seen) {
    if (isUndefinedOrNull(obj)) {
        return obj;
    }
    const changed = changer(obj);
    if (typeof changed !== 'undefined') {
        return changed;
    }
    if (Array.isArray(obj)) {
        const r1 = [];
        for (const e of obj) {
            r1.push(_cloneAndChange(e, changer, seen));
        }
        return r1;
    }
    if (isObject(obj)) {
        if (seen.has(obj)) {
            throw new Error('Cannot clone recursive data-structure');
        }
        seen.add(obj);
        const r2 = {};
        for (const i2 in obj) {
            if (_hasOwnProperty.call(obj, i2)) {
                r2[i2] = _cloneAndChange(obj[i2], changer, seen);
            }
        }
        seen.delete(obj);
        return r2;
    }
    return obj;
}
/**
 * Copies all properties of source into destination. The optional parameter "overwrite" allows to control
 * if existing properties on the destination should be overwritten or not. Defaults to true (overwrite).
 */
export function mixin(destination, source, overwrite = true) {
    if (!isObject(destination)) {
        return source;
    }
    if (isObject(source)) {
        Object.keys(source).forEach(key => {
            if (key in destination) {
                if (overwrite) {
                    if (isObject(destination[key]) && isObject(source[key])) {
                        mixin(destination[key], source[key], overwrite);
                    }
                    else {
                        destination[key] = source[key];
                    }
                }
            }
            else {
                destination[key] = source[key];
            }
        });
    }
    return destination;
}
export function equals(one, other) {
    if (one === other) {
        return true;
    }
    if (one === null || one === undefined || other === null || other === undefined) {
        return false;
    }
    if (typeof one !== typeof other) {
        return false;
    }
    if (typeof one !== 'object') {
        return false;
    }
    if ((Array.isArray(one)) !== (Array.isArray(other))) {
        return false;
    }
    let i;
    let key;
    if (Array.isArray(one)) {
        if (one.length !== other.length) {
            return false;
        }
        for (i = 0; i < one.length; i++) {
            if (!equals(one[i], other[i])) {
                return false;
            }
        }
    }
    else {
        const oneKeys = [];
        for (key in one) {
            oneKeys.push(key);
        }
        oneKeys.sort();
        const otherKeys = [];
        for (key in other) {
            otherKeys.push(key);
        }
        otherKeys.sort();
        if (!equals(oneKeys, otherKeys)) {
            return false;
        }
        for (i = 0; i < oneKeys.length; i++) {
            if (!equals(one[oneKeys[i]], other[oneKeys[i]])) {
                return false;
            }
        }
    }
    return true;
}
/**
 * Calls `JSON.Stringify` with a replacer to break apart any circular references.
 * This prevents `JSON`.stringify` from throwing the exception
 *  "Uncaught TypeError: Converting circular structure to JSON"
 */
export function safeStringify(obj) {
    const seen = new Set();
    return JSON.stringify(obj, (key, value) => {
        if (isObject(value) || Array.isArray(value)) {
            if (seen.has(value)) {
                return '[Circular]';
            }
            else {
                seen.add(value);
            }
        }
        if (typeof value === 'bigint') {
            return `[BigInt ${value.toString()}]`;
        }
        return value;
    });
}
/**
 * Returns an object that has keys for each value that is different in the base object. Keys
 * that do not exist in the target but in the base object are not considered.
 *
 * Note: This is not a deep-diffing method, so the values are strictly taken into the resulting
 * object if they differ.
 *
 * @param base the object to diff against
 * @param obj the object to use for diffing
 */
export function distinct(base, target) {
    const result = Object.create(null);
    if (!base || !target) {
        return result;
    }
    const targetKeys = Object.keys(target);
    targetKeys.forEach(k => {
        const baseValue = base[k];
        const targetValue = target[k];
        if (!equals(baseValue, targetValue)) {
            result[k] = targetValue;
        }
    });
    return result;
}
export function getCaseInsensitive(target, key) {
    const lowercaseKey = key.toLowerCase();
    const equivalentKey = Object.keys(target).find(k => k.toLowerCase() === lowercaseKey);
    return equivalentKey ? target[equivalentKey] : target[key];
}
export function filter(obj, predicate) {
    const result = Object.create(null);
    for (const [key, value] of Object.entries(obj)) {
        if (predicate(key, value)) {
            result[key] = value;
        }
    }
    return result;
}
export function mapValues(obj, fn) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        result[key] = fn(value, key);
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9vYmplY3RzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRXZFLE1BQU0sVUFBVSxTQUFTLENBQUksR0FBTTtJQUNsQyxJQUFJLENBQUMsR0FBRyxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ3JDLE9BQU8sR0FBRyxDQUFDO0lBQ1osQ0FBQztJQUNELElBQUksR0FBRyxZQUFZLE1BQU0sRUFBRSxDQUFDO1FBQzNCLE9BQU8sR0FBRyxDQUFDO0lBQ1osQ0FBQztJQUNELE1BQU0sTUFBTSxHQUFRLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ2pELE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRTtRQUM1QyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDN0UsQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUM7QUFFRCxNQUFNLFVBQVUsVUFBVSxDQUFJLEdBQU07SUFDbkMsSUFBSSxDQUFDLEdBQUcsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUNyQyxPQUFPLEdBQUcsQ0FB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