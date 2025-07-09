/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareBy, numberComparator } from './arrays.js';
import { groupBy } from './collections.js';
import { SetMap } from './map.js';
import { createSingleCallFunction } from './functional.js';
import { Iterable } from './iterator.js';
// #region Disposable Tracking
/**
 * Enables logging of potentially leaked disposables.
 *
 * A disposable is considered leaked if it is not disposed or not registered as the child of
 * another disposable. This tracking is very simple an only works for classes that either
 * extend Disposable or use a DisposableStore. This means there are a lot of false positives.
 */
const TRACK_DISPOSABLES = false;
let disposableTracker = null;
export class GCBasedDisposableTracker {
    constructor() {
        this._registry = new FinalizationRegistry(heldValue => {
            console.warn(`[LEAKED DISPOSABLE] ${heldValue}`);
        });
    }
    trackDisposable(disposable) {
        const stack = new Error('CREATED via:').stack;
        this._registry.register(disposable, stack, disposable);
    }
    setParent(child, parent) {
        if (parent) {
            this._registry.unregister(child);
        }
        else {
            this.trackDisposable(child);
        }
    }
    markAsDisposed(disposable) {
        this._registry.unregister(disposable);
    }
    markAsSingleton(disposable) {
        this._registry.unregister(disposable);
    }
}
export class DisposableTracker {
    constructor() {
        this.livingDisposables = new Map();
    }
    static { this.idx = 0; }
    getDisposableData(d) {
        let val = this.livingDisposables.get(d);
        if (!val) {
            val = { parent: null, source: null, isSingleton: false, value: d, idx: DisposableTracker.idx++ };
            this.livingDisposables.set(d, val);
        }
        return val;
    }
    trackDisposable(d) {
        const data = this.getDisposableData(d);
        if (!data.source) {
            data.source =
                new Error().stack;
        }
    }
    setParent(child, parent) {
        const data = this.getDisposableData(child);
        data.parent = parent;
    }
    markAsDisposed(x) {
        this.livingDisposables.delete(x);
    }
    markAsSingleton(disposable) {
        this.getDisposableData(disposable).isSingleton = true;
    }
    getRootParent(data, cache) {
        const cacheValue = cache.get(data);
        if (cacheValue) {
            return cacheValue;
        }
        const result = data.parent ? this.getRootParent(this.getDisposableData(data.parent), cache) : data;
        cache.set(data, result);
        return result;
    }
    getTrackedDisposables() {
        const rootParentCache = new Map();
        const leaking = [...this.livingDisposables.entries()]
            .filter(([, v]) => v.source !== null && !this.getRootParent(v, rootParentCache).isSingleton)
            .flatMap(([k]) => k);
        return leaking;
    }
    computeLeakingDisposables(maxReported = 10, preComputedLeaks) {
        let uncoveredLeakingObjs;
        if (preComputedLeaks) {
            uncoveredLeakingObjs = preComputedLeaks;
        }
        else {
            const rootParentCache = new Map();
            const leakingObjects = [...this.livingDisposables.values()]
                .filter((info) => info.source !== null && !this.getRootParent(info, rootParentCache).isSingleton);
            if (leakingObjects.length === 0) {
                return;
            }
            const leakingObjsSet = new Set(leakingObjects.map(o => o.value));
            // Remove all objects that are a child of other leaking objects. Assumes there are no cycles.
            uncoveredLeakingObjs = leakingObjects.filter(l => {
                return !(l.parent && leakingObjsSet.has(l.parent));
            });
            if (uncoveredLeakingObjs.length === 0) {
                throw new Error('There are cyclic diposable chains!');
            }
        }
        if (!uncoveredLeakingObjs) {
            return undefined;
        }
        function getStackTracePath(leaking) {
            function removePrefix(array, linesToRemove) {
                while (array.length > 0 && linesToRemove.some(regexp => typeof regexp === 'string' ? regexp === array[0] : array[0].match(regexp))) {
                    array.shift();
                }
            }
            const lines = leaking.source.split('\n').map(p => p.trim().replace('at ', '')).filter(l => l !== '');
            removePrefix(lines, ['Error', /^trackDisposable \(.*\)$/, /^DisposableTracker.trackDisposable \(.*\)$/]);
            return lines.reverse();
        }
        const stackTraceStarts = new SetMap();
        for (const leaking of uncoveredLeakingObjs) {
            const stackTracePath = getStackTracePath(leaking);
            for (let i = 0; i <= stackTracePath.length; i++) {
                stackTraceStarts.add(stackTracePath.slice(0, i).join('\n'), leaking);
            }
        }
        // Put earlier leaks first
        uncoveredLeakingObjs.sort(compareBy(l => l.idx, numberComparator));
        let message = '';
        let i = 0;
        for (const leaking of uncoveredLeakingObjs.slice(0, maxReported)) {
            i++;
            const stackTracePath = getStackTracePath(leaking);
            const stackTraceFormattedLines = [];
            for (let i = 0; i < stackTracePath.length; i++) {
                let line = stackTracePath[i];
                const starts = stackTraceStarts.get(stackTracePath.slice(0, i + 1).join('\n'));
                line = `(shared with ${starts.size}/${uncoveredLeakingObjs.length} leaks) at ${line}`;
                const prevStarts = stackTraceStarts.get(stackTracePath.slice(0, i).join('\n'));
                const continuations = groupBy([...prevStarts].map(d => getStackTracePath(d)[i]), v => v);
                delete continuations[stackTracePath[i]];
                for (const [cont, set] of Object.entries(continuations)) {
                    stackTraceFormattedLines.unshift(`    - stacktraces of ${set.length} other leaks continue with ${cont}`);
                }
                stackTraceFormattedLines.unshift(line);
            }
            message += `\n\n\n==================== Leaking disposable ${i}/${uncoveredLeakingObjs.length}: ${leaking.value.constructor.name} ====================\n${stackTraceFormattedLines.join('\n')}\n============================================================\n\n`;
        }
        if (uncoveredLeakingObjs.length > maxReported) {
            message += `\n\n\n... and ${uncoveredLeakingObjs.length - maxReported} more leaking disposables\n\n`;
        }
        return { leaks: uncoveredLeakingObjs, details: message };
    }
}
export function setDisposableTracker(tracker) {
    disposableTracker = tracker;
}
if (TRACK_DISPOSABLES) {
    const __is_disposable_tracked__ = '__is_disposable_tracked__';
    setDisposableTracker(new class {
        trackDisposable(x) {
            const stack = new Error('Potentially leaked disposable').stack;
            setTimeout(() => {
                if (!x[__is_disposable_tracked__]) {
                    console.log(stack);
                }
            }, 3000);
        }
        setParent(child, parent) {
            if (child && child !== Disposable.None) {
                try {
                    child[__is_disposable_tracked__] = true;
                }
                catch {
                    // noop
                }
            }
        }
        markAsDisposed(disposable) {
            if (disposable && disposable !== Disposable.None) {
                try {
                    disposable[__is_disposable_tracked__] = true;
                }
                catch {
                    // noop
                }
            }
        }
        markAsSingleton(disposable) { }
    });
}
export function trackDisposable(x) {
    disposableTracker?.trackDisposable(x);
    return x;
}
export function markAsDisposed(disposable) {
    disposableTracker?.markAsDisposed(disposable);
}
function setParentOfDisposable(child, parent) {
    disposableTracker?.setParent(child, parent);
}
function setParentOfDisposables(children, parent) {
    if (!disposableTracker) {
        return;
    }
    for (const child of children) {
        disposableTracker.setParent(child, parent);
    }
}
/**
 * Indicates that the given object is a singleton which does not need to be disposed.
*/
export function markAsSingleton(singleton) {
    disposableTracker?.markAsSingleton(singleton);
    return singleton;
}
/**
 * Check if `thing` is {@link IDisposable disposable}.
 */
export function isDisposable(thing) {
    return typeof thing === 'object' && thing !== null && typeof thing.dispose === 'function' && thing.dispose.length === 0;
}
export function dispose(arg) {
    if (Iterable.is(arg)) {
        const errors = [];
        for (const d of arg) {
            if (d) {
                try {
                    d.dispose();
                }
                catch (e) {
                    errors.push(e);
                }
            }
        }
        if (errors.length === 1) {
            throw errors[0];
        }
        else if (errors.length > 1) {
            throw new AggregateError(errors, 'Encountered errors while disposing of store');
        }
        return Array.isArray(arg) ? [] : arg;
    }
    else if (arg) {
        arg.dispose();
        return arg;
    }
}
export function disposeIfDisposable(disposables) {
    for (const d of disposables) {
        if (isDisposable(d)) {
            d.dispose();
        }
    }
    return [];
}
/**
 * Combine multiple disposable values into a single {@link IDisposable}.
 */
export function combinedDisposable(...disposables) {
    const parent = toDisposable(() => dispose(disposables));
    setParentOfDisposables(disposables, parent);
    return parent;
}
/**
 * Turn a function that implements dispose into an {@link IDisposable}.
 *
 * @param fn Clean up function, guaranteed to be called only **once**.
 */
export function toDisposable(fn) {
    const self = trackDisposable({
        dispose: createSingleCallFunction(() => {
            markAsDisposed(self);
            fn();
        })
    });
    return self;
}
/**
 * Manages a collection of disposable values.
 *
 * This is the preferred way to manage multiple disposables. A `DisposableStore` is safer to work with than an
 * `IDisposable[]` as it considers edge cases, such as registering the same value multiple times or adding an item to a
 * store that has already been disposed of.
 */
export class DisposableStore {
    static { this.DISABLE_DISPOSED_WARNING = false; }
    constructor() {
        this._toDispose = new Set();
        this._isDisposed = false;
        trackDisposable(this);
    }
    /**
     * Dispose of all registered disposables and mark this object as disposed.
     *
     * Any future disposables added to this object will be disposed of on `add`.
     */
    dispose() {
        if (this._isDisposed) {
            return;
        }
        markAsDisposed(this);
        this._isDisposed = true;
        this.clear();
    }
    /**
     * @return `true` if this object has been disposed of.
     */
    get isDisposed() {
        return this._isDisposed;
    }
    /**
     * Dispose of all registered disposables but do not mark this object as disposed.
     */
    clear() {
        if (this._toDispose.size === 0) {
            return;
        }
        try {
            dispose(this._toDispose);
        }
        finally {
            this._toDispose.clear();
        }
    }
    /**
     * Add a new {@link IDisposable disposable} to the collection.
     */
    add(o) {
        if (!o) {
            return o;
        }
        if (o === this) {
            throw new Error('Cannot register a disposable on itself!');
        }
        setParentOfDisposable(o, this);
        if (this._isDisposed) {
            if (!DisposableStore.DISABLE_DISPOSED_WARNING) {
                console.warn(new Error('Trying to add a disposable to a DisposableStore that has already been disposed of. The added object will be leaked!').stack);
            }
        }
        else {
            this._toDispose.add(o);
        }
        return o;
    }
    /**
     * Deletes a disposable from store and disposes of it. This will not throw or warn and proceed to dispose the
     * disposable even when the disposable is not part in the store.
     */
    delete(o) {
        if (!o) {
            return;
        }
        if (o === this) {
            throw new Error('Cannot dispose a disposable on itself!');
        }
        this._toDispose.delete(o);
        o.dispose();
    }
    /**
     * Deletes the value from the store, but does not dispose it.
     */
    deleteAndLeak(o) {
        if (!o) {
            return;
        }
        if (this._toDispose.has(o)) {
            this._toDispose.delete(o);
            setParentOfDisposable(o, null);
        }
    }
}
/**
 * Abstract base class for a {@link IDisposable disposable} object.
 *
 * Subclasses can {@linkcode _register} disposables that will be automatically cleaned up when this object is disposed of.
 */
export class Disposable {
    /**
     * A disposable that does nothing when it is disposed of.
     *
     * TODO: This should not be a static property.
     */
    static { this.None = Object.freeze({ dispose() { } }); }
    constructor() {
        this._store = new DisposableStore();
        trackDisposable(this);
        setParentOfDisposable(this._store, this);
    }
    dispose() {
        markAsDisposed(this);
        this._store.dispose();
    }
    /**
     * Adds `o` to the collection of disposables managed by this object.
     */
    _register(o) {
        if (o === this) {
            throw new Error('Cannot register a disposable on itself!');
        }
        return this._store.add(o);
    }
}
/**
 * Manages the lifecycle of a disposable value that may be changed.
 *
 * This ensures that when the disposable value is changed, the previously held disposable is disposed of. You can
 * also register a `MutableDisposable` on a `Disposable` to ensure it is automatically cleaned up.
 */
export class MutableDisposable {
    constructor() {
        this._isDisposed = false;
        trackDisposable(this);
    }
    get value() {
        return this._isDisposed ? undefined : this._value;
    }
    set value(value) {
        if (this._isDisposed || value === this._value) {
            return;
        }
        this._value?.dispose();
        if (value) {
            setParentOfDisposable(value, this);
        }
        this._value = value;
    }
    /**
     * Resets the stored value and disposed of the previously stored value.
     */
    clear() {
        this.value = undefined;
    }
    dispose() {
        this._isDisposed = true;
        markAsDisposed(this);
        this._value?.dispose();
        this._value = undefined;
    }
    /**
     * Clears the value, but does not dispose it.
     * The old value is returned.
    */
    clearAndLeak() {
        const oldValue = this._value;
        this._value = undefined;
        if (oldValue) {
            setParentOfDisposable(oldValue, null);
        }
        return oldValue;
    }
}
/**
 * Manages the lifecycle of a disposable value that may be changed like {@link MutableDisposable}, but the value must
 * exist and cannot be undefined.
 */
export class MandatoryMutableDisposable {
    constructor(initialValue) {
        this._disposable = new MutableDisposable();
        this._isDisposed = false;
        this._disposable.value = initialValue;
    }
    get value() {
        return this._disposable.value;
    }
    set value(value) {
        if (this._isDisposed || value === this._disposable.value) {
            return;
        }
        this._disposable.value = value;
    }
    dispose() {
        this._isDisposed = true;
        this._disposable.dispose();
    }
}
export class RefCountedDisposable {
    constructor(_disposable) {
        this._disposable = _disposable;
        this._counter = 1;
    }
    acquire() {
        this._counter++;
        return this;
    }
    release() {
        if (--this._counter === 0) {
            this._disposable.dispose();
        }
        return this;
    }
}
/**
 * A safe disposable can be `unset` so that a leaked reference (listener)
 * can be cut-off.
 */
export class SafeDisposable {
    constructor() {
        this.dispose = () => { };
        this.unset = () => { };
        this.isset = () => false;
        trackDisposable(this);
    }
    set(fn) {
        let callback = fn;
        this.unset = () => callback = undefined;
        this.isset = () => callback !== undefined;
        this.dispose = () => {
            if (callback) {
                callback();
                callback = undefined;
                markAsDisposed(this);
            }
        };
        return this;
    }
}
export class ReferenceCollection {
    constructor() {
        this.references = new Map();
    }
    acquire(key, ...args) {
        let reference = this.references.get(key);
        if (!reference) {
            reference = { counter: 0, object: this.createReferencedObject(key, ...args) };
            this.references.set(key, reference);
        }
        const { object } = reference;
        const dispose = createSingleCallFunction(() => {
            if (--reference.counter === 0) {
                this.destroyReferencedObject(key, reference.object);
                this.references.delete(key);
            }
        });
        reference.counter++;
        return { object, dispose };
    }
}
/**
 * Unwraps a reference collection of promised values. Makes sure
 * references are disposed whenever promises get rejected.
 */
export class AsyncReferenceCollection {
    constructor(referenceCollection) {
        this.referenceCollection = referenceCollection;
    }
    async acquire(key, ...args) {
        const ref = this.referenceCollection.acquire(key, ...args);
        try {
            const object = await ref.object;
            return {
                object,
                dispose: () => ref.dispose()
            };
        }
        catch (error) {
            ref.dispose();
            throw error;
        }
    }
}
export class ImmortalReference {
    constructor(object) {
        this.object = object;
    }
    dispose() { }
}
export function disposeOnReturn(fn) {
    const store = new DisposableStore();
    try {
        fn(store);
    }
    finally {
        store.dispose();
    }
}
/**
 * A map the manages the lifecycle of the values that it stores.
 */
export class DisposableMap {
    constructor() {
        this._store = new Map();
        this._isDisposed = false;
        trackDisposable(this);
    }
    /**
     * Disposes of all stored values and mark this object as disposed.
     *
     * Trying to use this object after it has been disposed of is an error.
     */
    dispose() {
        markAsDisposed(this);
        this._isDisposed = true;
        this.clearAndDisposeAll();
    }
    /**
     * Disposes of all stored values and clear the map, but DO NOT mark this object as disposed.
     */
    clearAndDisposeAll() {
        if (!this._store.size) {
            return;
        }
        try {
            dispose(this._store.values());
        }
        finally {
            this._store.clear();
        }
    }
    has(key) {
        return this._store.has(key);
    }
    get size() {
        return this._store.size;
    }
    get(key) {
        return this._store.get(key);
    }
    set(key, value, skipDisposeOnOverwrite = false) {
        if (this._isDisposed) {
            console.warn(new Error('Trying to add a disposable to a DisposableMap that has already been disposed of. The added object will be leaked!').stack);
        }
        if (!skipDisposeOnOverwrite) {
            this._store.get(key)?.dispose();
        }
        this._store.set(key, value);
    }
    /**
     * Delete the value stored for `key` from this map and also dispose of it.
     */
    deleteAndDispose(key) {
        this._store.get(key)?.dispose();
        this._store.delete(key);
    }
    /**
     * Delete the value stored for `key` from this map but return it. The caller is
     * responsible for disposing of the value.
     */
    deleteAndLeak(key) {
        const value = this._store.get(key);
        this._store.delete(key);
        return value;
    }
    keys() {
        return this._store.keys();
    }
    values() {
        return this._store.values();
    }
    [Symbol.iterator]() {
        return this._store[Symbol.iterator]();
    }
}
/**
 * Call `then` on a Promise, unless the returned disposable is disposed.
 */
export function thenIfNotDisposed(promise, then) {
    let disposed = false;
    promise.then(result => {
        if (disposed) {
            return;
        }
        then(result);
    });
    return toDisposable(() => {
        disposed = true;
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2xpZmVjeWNsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUMzQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQ2xDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFFekMsOEJBQThCO0FBRTlCOzs7Ozs7R0FNRztBQUNILE1BQU0saUJBQWlCLEdBQUcsS0FBSyxDQUFDO0FBQ2hDLElBQUksaUJBQWlCLEdBQThCLElBQUksQ0FBQztBQXlCeEQsTUFBTSxPQUFPLHdCQUF3QjtJQUFyQztRQUVrQixjQUFTLEdBQUcsSUFBSSxvQkFBb0IsQ0FBUyxTQUFTLENBQUMsRUFBRTtZQUN6RSxPQUFPLENBQUMsSUFBSSxDQUFDLHVCQUF1QixTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQ2xELENBQUMsQ0FBQyxDQUFDO0lBc0JKLENBQUM7SUFwQkEsZUFBZSxDQUFDLFVBQXVCO1FBQ3RDLE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLEtBQU0sQ0FBQztRQUMvQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFRCxTQUFTLENBQUMsS0FBa0IsRUFBRSxNQUEwQjtRQUN2RCxJQUFJLE1BQU0sRUFBRSxDQUFDO1lB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