/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { findFirstIdxMonotonousOrArrLen } from './arraysFind.js';
import { CancellationError } from './errors.js';
/**
 * Returns the last entry and the initial N-1 entries of the array, as a tuple of [rest, last].
 *
 * The array must have at least one element.
 *
 * @param arr The input array
 * @returns A tuple of [rest, last] where rest is all but the last element and last is the last element
 * @throws Error if the array is empty
 */
export function tail(arr) {
    if (arr.length === 0) {
        throw new Error('Invalid tail call');
    }
    return [arr.slice(0, arr.length - 1), arr[arr.length - 1]];
}
export function equals(one, other, itemEquals = (a, b) => a === b) {
    if (one === other) {
        return true;
    }
    if (!one || !other) {
        return false;
    }
    if (one.length !== other.length) {
        return false;
    }
    for (let i = 0, len = one.length; i < len; i++) {
        if (!itemEquals(one[i], other[i])) {
            return false;
        }
    }
    return true;
}
/**
 * Remove the element at `index` by replacing it with the last element. This is faster than `splice`
 * but changes the order of the array
 */
export function removeFastWithoutKeepingOrder(array, index) {
    const last = array.length - 1;
    if (index < last) {
        array[index] = array[last];
    }
    array.pop();
}
/**
 * Performs a binary search algorithm over a sorted array.
 *
 * @param array The array being searched.
 * @param key The value we search for.
 * @param comparator A function that takes two array elements and returns zero
 *   if they are equal, a negative number if the first element precedes the
 *   second one in the sorting order, or a positive number if the second element
 *   precedes the first one.
 * @return See {@link binarySearch2}
 */
export function binarySearch(array, key, comparator) {
    return binarySearch2(array.length, i => comparator(array[i], key));
}
/**
 * Performs a binary search algorithm over a sorted collection. Useful for cases
 * when we need to perform a binary search over something that isn't actually an
 * array, and converting data to an array would defeat the use of binary search
 * in the first place.
 *
 * @param length The collection length.
 * @param compareToKey A function that takes an index of an element in the
 *   collection and returns zero if the value at this index is equal to the
 *   search key, a negative number if the value precedes the search key in the
 *   sorting order, or a positive number if the search key precedes the value.
 * @return A non-negative index of an element, if found. If not found, the
 *   result is -(n+1) (or ~n, using bitwise notation), where n is the index
 *   where the key should be inserted to maintain the sorting order.
 */
export function binarySearch2(length, compareToKey) {
    let low = 0, high = length - 1;
    while (low <= high) {
        const mid = ((low + high) / 2) | 0;
        const comp = compareToKey(mid);
        if (comp < 0) {
            low = mid + 1;
        }
        else if (comp > 0) {
            high = mid - 1;
        }
        else {
            return mid;
        }
    }
    return -(low + 1);
}
export function quickSelect(nth, data, compare) {
    nth = nth | 0;
    if (nth >= data.length) {
        throw new TypeError('invalid index');
    }
    const pivotValue = data[Math.floor(data.length * Math.random())];
    const lower = [];
    const higher = [];
    const pivots = [];
    for (const value of data) {
        const val = compare(value, pivotValue);
        if (val < 0) {
            lower.push(value);
        }
        else if (val > 0) {
            higher.push(value);
        }
        else {
            pivots.push(value);
        }
    }
    if (nth < lower.length) {
        return quickSelect(nth, lower, compare);
    }
    else if (nth < lower.length + pivots.length) {
        return pivots[0];
    }
    else {
        return quickSelect(nth - (lower.length + pivots.length), higher, compare);
    }
}
export function groupBy(data, compare) {
    const result = [];
    let currentGroup = undefined;
    for (const element of data.slice(0).sort(compare)) {
        if (!currentGroup || compare(currentGroup[0], element) !== 0) {
            currentGroup = [element];
            result.push(currentGroup);
        }
        else {
            currentGroup.push(element);
        }
    }
    return result;
}
/**
 * Splits the given items into a list of (non-empty) groups.
 * `shouldBeGrouped` is used to decide if two consecutive items should be in the same group.
 * The order of the items is preserved.
 */
export function* groupAdjacentBy(items, shouldBeGrouped) {
    let currentGroup;
    let last;
    for (const item of items) {
        if (last !== undefined && shouldBeGrouped(last, item)) {
            currentGroup.push(item);
        }
        else {
            if (currentGroup) {
                yield currentGroup;
            }
            currentGroup = [item];
        }
        last = item;
    }
    if (currentGroup) {
        yield currentGroup;
    }
}
export function forEachAdjacent(arr, f) {
    for (let i = 0; i <= arr.length; i++) {
        f(i === 0 ? undefined : arr[i - 1], i === arr.length ? undefined : arr[i]);
    }
}
export function forEachWithNeighbors(arr, f) {
    for (let i = 0; i < arr.length; i++) {
        f(i === 0 ? undefined : arr[i - 1], arr[i], i + 1 === arr.length ? undefined : arr[i + 1]);
    }
}
/**
 * Diffs two *sorted* arrays and computes the splices which apply the diff.
 */
export function sortedDiff(before, after, compare) {
    const result = [];
    function pushSplice(start, deleteCount, toInsert) {
        if (deleteCount === 0 && toInsert.length === 0) {
            return;
        }
        const latest = result[result.length - 1];
        if (latest && latest.start + latest.deleteCount === start) {
            latest.deleteCount += deleteCount;
            latest.toInsert.push(...toInsert);
        }
        else {
            result.push({ start, deleteCount, toInsert });
        }
    }
    let beforeIdx = 0;
    let afterIdx = 0;
    while (true) {
        if (beforeIdx === before.length) {
            pushSplice(beforeIdx, 0, after.slice(afterIdx));
            break;
        }
        if (afterIdx === after.length) {
            pushSplice(beforeIdx, before.length - beforeIdx, []);
            break;
        }
        const beforeElement = before[beforeIdx];
        const afterElement = after[afterIdx];
        const n = compare(beforeElement, afterElement);
        if (n === 0) {
            // equal
            beforeIdx += 1;
            afterIdx += 1;
        }
        else if (n < 0) {
            // beforeElement is smaller -> before element removed
            pushSplice(beforeIdx, 1, []);
            beforeIdx += 1;
        }
        else if (n > 0) {
            // beforeElement is greater -> after element added
            pushSplice(beforeIdx, 0, [afterElement]);
            afterIdx += 1;
        }
    }
    return result;
}
/**
 * Takes two *sorted* arrays and computes their delta (removed, added elements).
 * Finishes in `Math.min(before.length, after.length)` steps.
 */
export function delta(before, after, compare) {
    const splices = sortedDiff(before, after, compare);
    const removed = [];
    const added = [];
    for (const splice of splices) {
        removed.push(...before.slice(splice.start, splice.start + splice.deleteCount));
        added.push(...splice.toInsert);
    }
    return { removed, added };
}
/**
 * Returns the top N elements from the array.
 *
 * Faster than sorting the entire array when the array is a lot larger than N.
 *
 * @param array The unsorted array.
 * @param compare A sort function for the elements.
 * @param n The number of elements to return.
 * @return The first n elements from array when sorted with compare.
 */
export function top(array, compare, n) {
    if (n === 0) {
        return [];
    }
    const result = array.slice(0, n).sort(compare);
    topStep(array, compare, result, n, array.length);
    return result;
}
/**
 * Asynchronous variant of `top()` allowing for splitting up work in batches between which the event loop can run.
 *
 * Returns the top N elements from the array.
 *
 * Faster than sorting the entire array when the array is a lot larger than N.
 *
 * @param array The unsorted array.
 * @param compare A sort function for the elements.
 * @param n The number of elements to return.
 * @param batch The number of elements to examine before yielding to the event loop.
 * @return The first n elements from array when sorted with compare.
 */
export function topAsync(array, compare, n, batch, token) {
    if (n === 0) {
        return Promise.resolve([]);
    }
    return new Promise((resolve, reject) => {
        (async () => {
            const o = array.length;
            const result = array.slice(0, n).sort(compare);
            for (let i = n, m = Math.min(n + batch, o); i < o; i = m, m = Math.min(m + batch, o)) {
                if (i > n) {
                    await new Promise(resolve => setTimeout(resolve)); // any other delay function would starve I/O
                }
                if (token && token.isCancellationRequested) {
                    throw new CancellationError();
                }
                topStep(array, compare, result, i, m);
            }
            return result;
        })()
            .then(resolve, reject);
    });
}
function topStep(array, compare, result, i, m) {
    for (const n = result.length; i < m; i++) {
        const element = array[i];
        if (compare(element, result[n - 1]) < 0) {
            result.pop();
            const j = findFirstIdxMonotonousOrArrLen(result, e => compare(element, e) < 0);
            result.splice(j, 0, element);
        }
    }
}
/**
 * @returns New array with all falsy values removed. The original array IS NOT modified.
 */
export function coalesce(array) {
    return array.filter((e) => !!e);
}
/**
 * Remove all falsy values from `array`. The original array IS modified.
 */
export function coalesceInPlace(array) {
    let to = 0;
    for (let i = 0; i < array.length; i++) {
        if (!!array[i]) {
            array[to] = array[i];
            to += 1;
        }
    }
    array.length = to;
}
/**
 * @deprecated Use `Array.copyWithin` instead
 */
export function move(array, from, to) {
    array.splice(to, 0, array.splice(from, 1)[0]);
}
/**
 * @returns false if the provided object is an array and not empty.
 */
export function isFalsyOrEmpty(obj) {
    return !Array.isArray(obj) || obj.length === 0;
}
export function isNonEmptyArray(obj) {
    return Array.isArray(obj) && obj.length > 0;
}
/**
 * Removes duplicates from the given array. The optional keyFn allows to specify
 * how elements are checked for equality by returning an alternate value for each.
 */
export function distinct(array, keyFn = value => value) {
    const seen = new Set();
    return array.filter(element => {
        const key = keyFn(element);
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}
export function uniqueFilter(keyFn) {
    const seen = new Set();
    return element => {
        const key = keyFn(element);
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    };
}
export function commonPrefixLength(one, other, equals = (a, b) => a === b) {
    let result = 0;
    for (let i = 0, len = Math.min(one.length, other.length); i < len && equals(one[i], other[i]); i++) {
        result++;
    }
    return result;
}
export function range(arg, to) {
    let from = typeof to === 'number' ? arg : 0;
    if (typeof to === 'number') {
        from = arg;
    }
    else {
        from = 0;
        to = arg;
    }
    const result = [];
    if (from <= to) {
        for (let i = from; i < to; i++) {
            result.push(i);
        }
    }
    else {
        for (let i = from; i > to; i--) {
            result.push(i);
        }
    }
    return result;
}
export function index(array, indexer, mapper) {
    return array.reduce((r, t) => {
        r[indexer(t)] = mapper ? mapper(t) : t;
        return r;
    }, Object.create(null));
}
/**
 * Inserts an element into an array. Returns a function which, when
 * called, will remove that element from the array.
 *
 * @deprecated In almost all cases, use a `Set<T>` instead.
 */
export function insert(array, element) {
    array.push(element);
    return () => remove(array, element);
}
/**
 * Removes an element from an array if it can be found.
 *
 * @deprecated In almost all cases, use a `Set<T>` instead.
 */
export function remove(array, element) {
    const index = array.indexOf(element);
    if (index > -1) {
        array.splice(index, 1);
        return element;
    }
    return undefined;
}
/**
 * Insert `insertArr` inside `target` at `insertIndex`.
 * Please don't touch unless you understand https://jsperf.com/inserting-an-array-within-an-array
 */
export function arrayInsert(target, insertIndex, insertArr) {
    const before = target.slice(0, insertIndex);
    const after = target.slice(insertIndex);
    return before.concat(insertArr, after);
}
/**
 * Uses Fisher-Yates shuffle to shuffle the given array
 */
export function shuffle(array, _seed) {
    let rand;
    if (typeof _seed === 'number') {
        let seed = _seed;
        // Seeded random number generator in JS. Modified from:
        // https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
        rand = () => {
            const x = Math.sin(seed++) * 179426549; // throw away most significant digits and reduce any potential bias
            return x - Math.floor(x);
        };
    }
    else {
        rand = Math.random;
    }
    for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rand() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}
/**
 * Pushes an element to the start of the array, if found.
 */
export function pushToStart(arr, value) {
    const index = arr.indexOf(value);
    if (index > -1) {
        arr.splice(index, 1);
        arr.unshift(value);
    }
}
/**
 * Pushes an element to the end of the array, if found.
 */
export function pushToEnd(arr, value) {
    const index = arr.indexOf(value);
    if (index > -1) {
        arr.splice(index, 1);
        arr.push(value);
    }
}
export function pushMany(arr, items) {
    for (const item of items) {
        arr.push(item);
    }
}
export function mapArrayOrNot(items, fn) {
    return Array.isArray(items) ?
        items.map(fn) :
        fn(items);
}
export function asArray(x) {
    return Array.isArray(x) ? x : [x];
}
export function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
/**
 * Insert the new items in the array.
 * @param array The original array.
 * @param start The zero-based location in the array from which to start inserting elements.
 * @param newItems The items to be inserted
 */
export function insertInto(array, start, newItems) {
    const startIdx = getActualStartIndex(array, start);
    const originalLength = array.length;
    const newItemsLength = newItems.length;
    array.length = originalLength + newItemsLength;
    // Move the items after the start index, start from the end so that we don't overwrite any value.
    for (let i = originalLength - 1; i >= startIdx; i--) {
        array[i + newItemsLength] = array[i];
    }
    for (let i = 0; i < newItemsLength; i++) {
        array[i + startIdx] = newItems[i];
    }
}
/**
 * Removes elements from an array and inserts new elements in their place, returning the deleted elements. Alternative to the native Array.splice method, it
 * can only support limited number of items due to the maximum call stack size limit.
 * @param array The original array.
 * @param start The zero-based location in the array from which to start removing elements.
 * @param deleteCount The number of elements to remove.
 * @returns An array containing the elements that were deleted.
 */
export function splice(array, start, deleteCount, newItems) {
    const index = getActualStartIndex(array, start);
    let result = array.splice(index, deleteCount);
    if (result === undefined) {
        // see https://bugs.webkit.org/show_bug.cgi?id=261140
        result = [];
    }
    insertInto(array, index, newItems);
    return result;
}
/**
 * Determine the actual start index (same logic as the native splice() or slice())
 * If greater than the length of the array, start will be set to the length of the array. In this case, no element will be deleted but the method will behave as an adding function, adding as many element as item[n*] provided.
 * If negative, it will begin that many elements from the end of the array. (In this case, the origin -1, meaning -n is the index of the nth last element, and is therefore equivalent to the index of array.length - n.) If array.length + start is less than 0, it will begin from index 0.
 * @param array The target array.
 * @param start The operation index.
 */
function getActualStartIndex(array, start) {
    return start < 0 ? Math.max(start + array.length, 0) : Math.min(start, array.length);
}
/**
 * Utility that helps to pick a property from an object.
 *
 * ## Examples
 *
 * ```typescript
 * interface IObject = {
 *   a: number,
 *   b: string,
 * };
 *
 * const list: IObject[] = [
 *   { a: 1, b: 'foo' },
 *   { a: 2, b: 'bar' },
 * ];
 *
 * assert.deepStrictEqual(
 *   list.map(pick('a')),
 *   [1, 2],
 * );
 * ```
 */
export const pick = (key) => {
    return (obj) => {
        return obj[key];
    };
};
export var CompareResult;
(function (CompareResult) {
    function isLessThan(result) {
        return result < 0;
    }
    CompareResult.isLessThan = isLessThan;
    function isLessThanOrEqual(result) {
        return result <= 0;
    }
    CompareResult.isLessThanOrEqual = isLessThanOrEqual;
    function isGreaterThan(result) {
        return result > 0;
    }
    CompareResult.isGreaterThan = isGreaterThan;
    function isNeitherLessOrGreaterThan(result) {
        return result === 0;
    }
    CompareResult.isNeitherLessOrGreaterThan = isNeitherLessOrGreaterThan;
    CompareResult.greaterThan = 1;
    CompareResult.lessThan = -1;
    CompareResult.neitherLessOrGreaterThan = 0;
})(CompareResult || (CompareResult = {}));
export function compareBy(selector, comparator) {
    return (a, b) => comparator(selector(a), selector(b));
}
export function tieBreakComparators(...comparators) {
    return (item1, item2) => {
        for (const comparator of comparators) {
            const result = comparator(item1, item2);
            if (!CompareResult.isNeitherLessOrGreaterThan(result)) {
                return result;
            }
        }
        return CompareResult.neitherLessOrGreaterThan;
    };
}
/**
 * The natural order on numbers.
*/
export const numberComparator = (a, b) => a - b;
export const booleanComparator = (a, b) => numberComparator(a ? 1 : 0, b ? 1 : 0);
export function reverseOrder(comparator) {
    return (a, b) => -comparator(a, b);
}
/**
 * Returns a new comparator that treats `undefined` as the smallest value.
 * All other values are compared using the given comparator.
*/
export function compareUndefinedSmallest(comparator) {
    return (a, b) => {
        if (a === undefined) {
            return b === undefined ? CompareResult.neitherLessOrGreaterThan : CompareResult.lessThan;
        }
        else if (b === undefined) {
            return CompareResult.greaterThan;
        }
        return comparator(a, b);
    };
}
export class ArrayQueue {
    /**
     * Constructs a queue that is backed by the given array. Runtime is O(1).
    */
    constructor(items) {
        this.items = items;
        this.firstIdx = 0;
        this.lastIdx = this.items.length - 1;
    }
    get length() {
        return this.lastIdx - this.firstIdx + 1;
    }
    /**
     * Consumes elements from the beginning of the queue as long as the predicate returns true.
     * If no elements were consumed, `null` is returned. Has a runtime of O(result.length).
    */
    takeWhile(predicate) {
        // P(k) := k <= this.lastIdx && predicate(this.items[k])
        // Find s := min { k | k >= this.firstIdx && !P(k) } and return this.data[this.firstIdx...s)
        let startIdx = this.firstIdx;
        while (startIdx < this.items.length && predicate(this.items[startIdx])) {
            startIdx++;
        }
        const result = startIdx === this.firstIdx ? null : this.items.slice(this.firstIdx, startIdx);
        this.firstIdx = startIdx;
        return result;
    }
    /**
     * Consumes elements from the end of the queue as long as the predicate returns true.
     * If no elements were consumed, `null` is returned.
     * The result has the same order as the underlying array!
    */
    takeFromEndWhile(predicate) {
        // P(k) := this.firstIdx >= k && predicate(this.items[k])
        // Find s := max { k | k <= this.lastIdx && !P(k) } and return this.data(s...this.lastIdx]
        let endIdx = this.lastIdx;
        while (endIdx >= 0 && predicate(this.items[endIdx])) {
            endIdx--;
        }
        const result = endIdx === this.lastIdx ? null : this.items.slice(endIdx + 1, this.lastIdx + 1);
        this.lastIdx = endIdx;
        return result;
    }
    peek() {
        if (this.length === 0) {
            return undefined;
        }
        return this.items[this.firstIdx];
    }
    peekLast() {
        if (this.length === 0) {
            return undefined;
        }
        return this.items[this.lastIdx];
    }
    dequeue() {
        const result = this.items[this.firstIdx];
        this.firstIdx++;
        return result;
    }
    removeLast() {
        const result = this.items[this.lastIdx];
        this.lastIdx--;
        return result;
    }
    takeCount(count) {
        const result = this.items.slice(this.firstIdx, this.firstIdx + count);
        this.firstIdx += count;
        return result;
    }
}
/**
 * This class is faster than an iterator and array for lazy computed data.
*/
export class CallbackIterable {
    static { this.empty = new CallbackIterable(_callback => { }); }
    constructor(
    /**
     * Calls the callback for every item.
     * Stops when the callback returns false.
    */
    iterate) {
        this.iterate = iterate;
    }
    forEach(handler) {
        this.iterate(item => { handler(item); return true; });
    }
    toArray() {
        const result = [];
        this.iterate(item => { result.push(item); return true; });
        return result;
    }
    filter(predicate) {
        return new CallbackIterable(cb => this.iterate(item => predicate(item) ? cb(item) : true));
    }
    map(mapFn) {
        return new CallbackIterable(cb => this.iterate(item => cb(mapFn(item))));
    }
    some(predicate) {
        let result = false;
        this.iterate(item => { result = predicate(item); return !result; });
        return result;
    }
    findFirst(predicate) {
        let result;
        this.iterate(item => {
            if (predicate(item)) {
                result = item;
                return false;
            }
            return true;
        });
        return result;
    }
    findLast(predicate) {
        let result;
        this.iterate(item => {
            if (predicate(item)) {
                result = item;
            }
            return true;
        });
        return result;
    }
    findLastMaxBy(comparator) {
        let result;
        let first = true;
        this.iterate(item => {
            if (first || CompareResult.isGreaterThan(comparator(item, result))) {
                first = false;
                result = item;
            }
            return true;
        });
        return result;
    }
}
/**
 * Represents a re-arrangement of items in an array.
 */
export class Permutation {
    constructor(_indexMap) {
        this._indexMap = _indexMap;
    }
    /**
     * Returns a permutation that sorts the given array according to the given compare function.
     */
    static createSortPermutation(arr, compareFn) {
        const sortIndices = Array.from(arr.keys()).sort((index1, index2) => compareFn(arr[index1], arr[index2]));
        return new Permutation(sortIndices);
    }
    /**
     * Returns a new array with the elements of the given array re-arranged according to this permutation.
     */
    apply(arr) {
        return arr.map((_, index) => arr[this._indexMap[index]]);
    }
    /**
     * Returns a new permutation that undoes the re-arrangement of this permutation.
    */
    inverse() {
        const inverseIndexMap = this._indexMap.slice();
        for (let i = 0; i < this._indexMap.length; i++) {
            inverseIndexMap[this._indexMap[i]] = i;
        }
        return new Permutation(inverseIndexMap);
    }
}
/**
 * Asynchronous variant of `Array.find()`, returning the first element in
 * the array for which the predicate returns true.
 *
 * This implementation does not bail early and waits for all promises to
 * resolve before returning.
 */
export async function findAsync(array, predicate) {
    const results = await Promise.all(array.map(async (element, index) => ({ element, ok: await predicate(element, index) })));
    return results.find(r => r.ok)?.element;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJyYXlzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2FycmF5cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUVqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFHaEQ7Ozs7Ozs7O0dBUUc7QUFDSCxNQUFNLFVBQVUsSUFBSSxDQUFJLEdBQVE7SUFDL0IsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1RCxDQUFDO0FBRUQsTUFBTSxVQUFVLE1BQU0sQ0FBSSxHQUFpQyxFQUFFLEtBQW1DLEVBQUUsYUFBc0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQztJQUN4SixJQUFJLEdBQUcsS0FBSyxLQUFLLEVBQUUsQ0FBQztRQUNuQixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDcEIsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNqQyxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFF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