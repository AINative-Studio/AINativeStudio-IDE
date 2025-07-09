/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assert } from './assert.js';
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
export function rot(index, modulo) {
    return (modulo + (index % modulo)) % modulo;
}
export class Counter {
    constructor() {
        this._next = 0;
    }
    getNext() {
        return this._next++;
    }
}
export class MovingAverage {
    constructor() {
        this._n = 1;
        this._val = 0;
    }
    update(value) {
        this._val = this._val + (value - this._val) / this._n;
        this._n += 1;
        return this._val;
    }
    get value() {
        return this._val;
    }
}
export class SlidingWindowAverage {
    constructor(size) {
        this._n = 0;
        this._val = 0;
        this._values = [];
        this._index = 0;
        this._sum = 0;
        this._values = new Array(size);
        this._values.fill(0, 0, size);
    }
    update(value) {
        const oldValue = this._values[this._index];
        this._values[this._index] = value;
        this._index = (this._index + 1) % this._values.length;
        this._sum -= oldValue;
        this._sum += value;
        if (this._n < this._values.length) {
            this._n += 1;
        }
        this._val = this._sum / this._n;
        return this._val;
    }
    get value() {
        return this._val;
    }
}
/** Returns whether the point is within the triangle formed by the following 6 x/y point pairs */
export function isPointWithinTriangle(x, y, ax, ay, bx, by, cx, cy) {
    const v0x = cx - ax;
    const v0y = cy - ay;
    const v1x = bx - ax;
    const v1y = by - ay;
    const v2x = x - ax;
    const v2y = y - ay;
    const dot00 = v0x * v0x + v0y * v0y;
    const dot01 = v0x * v1x + v0y * v1y;
    const dot02 = v0x * v2x + v0y * v2y;
    const dot11 = v1x * v1x + v1y * v1y;
    const dot12 = v1x * v2x + v1y * v2y;
    const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
    const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    const v = (dot00 * dot12 - dot01 * dot02) * invDenom;
    return u >= 0 && v >= 0 && u + v < 1;
}
/**
 * Function to get a (pseudo)random integer from a provided `max`...[`min`] range.
 * Both `min` and `max` values are inclusive. The `min` value is optional and defaults
 * to `0` if not explicitly specified.
 *
 * @throws in the next cases:
 * 	- if provided `min` or `max` is not a number
 *  - if provided `min` or `max` is not finite
 *  - if provided `min` is larger than `max` value
 *
 * ## Examples
 *
 * Specifying a `max` value only uses `0` as the `min` value by default:
 *
 * ```typescript
 * // get a random integer between 0 and 10
 * const randomInt = randomInt(10);
 *
 * assert(
 *   randomInt >= 0,
 *   'Should be greater than or equal to 0.',
 * );
 *
 * assert(
 *   randomInt <= 10,
 *   'Should be less than or equal to 10.',
 * );
 * ```
 * * Specifying both `max` and `min` values:
 *
 * ```typescript
 * // get a random integer between 5 and 8
 * const randomInt = randomInt(8, 5);
 *
 * assert(
 *   randomInt >= 5,
 *   'Should be greater than or equal to 5.',
 * );
 *
 * assert(
 *   randomInt <= 8,
 *   'Should be less than or equal to 8.',
 * );
 * ```
 */
export const randomInt = (max, min = 0) => {
    assert(!isNaN(min), '"min" param is not a number.');
    assert(!isNaN(max), '"max" param is not a number.');
    assert(isFinite(max), '"max" param is not finite.');
    assert(isFinite(min), '"min" param is not finite.');
    assert(max > min, `"max"(${max}) param should be greater than "min"(${min}).`);
    const delta = max - min;
    const randomFloat = delta * Math.random();
    return Math.round(min + randomFloat);
};
export function randomChance(p) {
    assert(p >= 0 && p <= 1, 'p must be between 0 and 1');
    return Math.random() < p;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnVtYmVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9udW1iZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFFckMsTUFBTSxVQUFVLEtBQUssQ0FBQyxLQUFhLEVBQUUsR0FBVyxFQUFFLEdBQVc7SUFDNUQsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQzVDLENBQUM7QUFFRCxNQUFNLFVBQVUsR0FBRyxDQUFDLEtBQWEsRUFBRSxNQUFjO0lBQ2hELE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUM7QUFDN0MsQ0FBQztBQUVELE1BQU0sT0FBTyxPQUFPO0lBQXBCO1FBQ1MsVUFBSyxHQUFHLENBQUMsQ0FBQztJQUtuQixDQUFDO0lBSEEsT0FBTztRQUNOLE9BQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3JCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxhQUFhO0lBQTFCO1FBRVMsT0FBRSxHQUFHLENBQUMsQ0FBQztRQUNQLFNBQUksR0FBRyxDQUFDLENBQUM7SUFXbEIsQ0FBQztJQVRBLE1BQU0sQ0FBQyxLQUFhO1FBQ25CLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUN0RCxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNiLE9BQU8sSUFBSSxDQUFDLElB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