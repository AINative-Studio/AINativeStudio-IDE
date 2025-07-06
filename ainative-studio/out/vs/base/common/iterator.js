/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isIterable } from './types.js';
export var Iterable;
(function (Iterable) {
    function is(thing) {
        return thing && typeof thing === 'object' && typeof thing[Symbol.iterator] === 'function';
    }
    Iterable.is = is;
    const _empty = Object.freeze([]);
    function empty() {
        return _empty;
    }
    Iterable.empty = empty;
    function* single(element) {
        yield element;
    }
    Iterable.single = single;
    function wrap(iterableOrElement) {
        if (is(iterableOrElement)) {
            return iterableOrElement;
        }
        else {
            return single(iterableOrElement);
        }
    }
    Iterable.wrap = wrap;
    function from(iterable) {
        return iterable || _empty;
    }
    Iterable.from = from;
    function* reverse(array) {
        for (let i = array.length - 1; i >= 0; i--) {
            yield array[i];
        }
    }
    Iterable.reverse = reverse;
    function isEmpty(iterable) {
        return !iterable || iterable[Symbol.iterator]().next().done === true;
    }
    Iterable.isEmpty = isEmpty;
    function first(iterable) {
        return iterable[Symbol.iterator]().next().value;
    }
    Iterable.first = first;
    function some(iterable, predicate) {
        let i = 0;
        for (const element of iterable) {
            if (predicate(element, i++)) {
                return true;
            }
        }
        return false;
    }
    Iterable.some = some;
    function find(iterable, predicate) {
        for (const element of iterable) {
            if (predicate(element)) {
                return element;
            }
        }
        return undefined;
    }
    Iterable.find = find;
    function* filter(iterable, predicate) {
        for (const element of iterable) {
            if (predicate(element)) {
                yield element;
            }
        }
    }
    Iterable.filter = filter;
    function* map(iterable, fn) {
        let index = 0;
        for (const element of iterable) {
            yield fn(element, index++);
        }
    }
    Iterable.map = map;
    function* flatMap(iterable, fn) {
        let index = 0;
        for (const element of iterable) {
            yield* fn(element, index++);
        }
    }
    Iterable.flatMap = flatMap;
    function* concat(...iterables) {
        for (const item of iterables) {
            if (isIterable(item)) {
                yield* item;
            }
            else {
                yield item;
            }
        }
    }
    Iterable.concat = concat;
    function reduce(iterable, reducer, initialValue) {
        let value = initialValue;
        for (const element of iterable) {
            value = reducer(value, element);
        }
        return value;
    }
    Iterable.reduce = reduce;
    function length(iterable) {
        let count = 0;
        for (const _ of iterable) {
            count++;
        }
        return count;
    }
    Iterable.length = length;
    /**
     * Returns an iterable slice of the array, with the same semantics as `array.slice()`.
     */
    function* slice(arr, from, to = arr.length) {
        if (from < -arr.length) {
            from = 0;
        }
        if (from < 0) {
            from += arr.length;
        }
        if (to < 0) {
            to += arr.length;
        }
        else if (to > arr.length) {
            to = arr.length;
        }
        for (; from < to; from++) {
            yield arr[from];
        }
    }
    Iterable.slice = slice;
    /**
     * Consumes `atMost` elements from iterable and returns the consumed elements,
     * and an iterable for the rest of the elements.
     */
    function consume(iterable, atMost = Number.POSITIVE_INFINITY) {
        const consumed = [];
        if (atMost === 0) {
            return [consumed, iterable];
        }
        const iterator = iterable[Symbol.iterator]();
        for (let i = 0; i < atMost; i++) {
            const next = iterator.next();
            if (next.done) {
                return [consumed, Iterable.empty()];
            }
            consumed.push(next.value);
        }
        return [consumed, { [Symbol.iterator]() { return iterator; } }];
    }
    Iterable.consume = consume;
    async function asyncToArray(iterable) {
        const result = [];
        for await (const item of iterable) {
            result.push(item);
        }
        return Promise.resolve(result);
    }
    Iterable.asyncToArray = asyncToArray;
})(Iterable || (Iterable = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXRlcmF0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9pdGVyYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRXhDLE1BQU0sS0FBVyxRQUFRLENBd0t4QjtBQXhLRCxXQUFpQixRQUFRO0lBRXhCLFNBQWdCLEVBQUUsQ0FBVSxLQUFVO1FBQ3JDLE9BQU8sS0FBSyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxPQUFPLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssVUFBVSxDQUFDO0lBQzNGLENBQUM7SUFGZSxXQUFFLEtBRWpCLENBQUE7SUFFRCxNQUFNLE1BQU0sR0FBa0IsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNoRCxTQUFnQixLQUFLO1FBQ3BCLE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUZlLGNBQUssUUFFcEIsQ0FBQTtJQUVELFFBQWUsQ0FBQyxDQUFDLE1BQU0sQ0FBSSxPQUFVO1FBQ3BDLE1BQU0sT0FBTyxDQUFDO0lBQ2YsQ0FBQztJQUZnQixlQUFNLFNBRXRCLENBQUE7SUFFRCxTQUFnQixJQUFJLENBQUksaUJBQWtDO1FBQ3pELElBQUksRUFBRSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQztZQUMzQixPQUFPLGlCQUFpQixDQUFDO1FBQzFCLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNsQyxDQUFDO0lBQ0YsQ0FBQztJQU5lLGFBQUksT0FNbkIsQ0FBQTtJQUVELFNBQWdCLElBQUksQ0FBSSxRQUF3QztRQUMvRCxPQUFPLFFBQVEsSUFBSSxNQUFNLENBQUM7SUFD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