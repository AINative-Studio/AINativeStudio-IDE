/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { autorun, autorunOpts, autorunWithStoreHandleChanges } from './autorun.js';
import { BaseObservable, ConvenientObservable, _setKeepObserved, _setRecomputeInitiallyAndOnChange, observableValue, subtransaction, transaction } from './base.js';
import { DebugNameData, getDebugName, } from './debugName.js';
import { BugIndicatingError, DisposableStore, Event, strictEquals, toDisposable } from './commonFacade/deps.js';
import { derived, derivedOpts } from './derived.js';
import { getLogger } from './logging/logging.js';
/**
 * Represents an efficient observable whose value never changes.
 */
export function constObservable(value) {
    return new ConstObservable(value);
}
class ConstObservable extends ConvenientObservable {
    constructor(value) {
        super();
        this.value = value;
    }
    get debugName() {
        return this.toString();
    }
    get() {
        return this.value;
    }
    addObserver(observer) {
        // NO OP
    }
    removeObserver(observer) {
        // NO OP
    }
    log() {
        return this;
    }
    toString() {
        return `Const: ${this.value}`;
    }
}
export function observableFromPromise(promise) {
    const observable = observableValue('promiseValue', {});
    promise.then((value) => {
        observable.set({ value }, undefined);
    });
    return observable;
}
export function observableFromEvent(...args) {
    let owner;
    let event;
    let getValue;
    if (args.length === 3) {
        [owner, event, getValue] = args;
    }
    else {
        [event, getValue] = args;
    }
    return new FromEventObservable(new DebugNameData(owner, undefined, getValue), event, getValue, () => FromEventObservable.globalTransaction, strictEquals);
}
export function observableFromEventOpts(options, event, getValue) {
    return new FromEventObservable(new DebugNameData(options.owner, options.debugName, options.debugReferenceFn ?? getValue), event, getValue, () => FromEventObservable.globalTransaction, options.equalsFn ?? strictEquals);
}
export class FromEventObservable extends BaseObservable {
    constructor(_debugNameData, event, _getValue, _getTransaction, _equalityComparator) {
        super();
        this._debugNameData = _debugNameData;
        this.event = event;
        this._getValue = _getValue;
        this._getTransaction = _getTransaction;
        this._equalityComparator = _equalityComparator;
        this._hasValue = false;
        this.handleEvent = (args) => {
            const newValue = this._getValue(args);
            const oldValue = this._value;
            const didChange = !this._hasValue || !(this._equalityComparator(oldValue, newValue));
            let didRunTransaction = false;
            if (didChange) {
                this._value = newValue;
                if (this._hasValue) {
                    didRunTransaction = true;
                    subtransaction(this._getTransaction(), (tx) => {
                        getLogger()?.handleObservableUpdated(this, { oldValue, newValue, change: undefined, didChange, hadValue: this._hasValue });
                        for (const o of this._observers) {
                            tx.updateObserver(o, this);
                            o.handleChange(this, undefined);
                        }
                    }, () => {
                        const name = this.getDebugName();
                        return 'Event fired' + (name ? `: ${name}` : '');
                    });
                }
                this._hasValue = true;
            }
            if (!didRunTransaction) {
                getLogger()?.handleObservableUpdated(this, { oldValue, newValue, change: undefined, didChange, hadValue: this._hasValue });
            }
        };
    }
    getDebugName() {
        return this._debugNameData.getDebugName(this);
    }
    get debugName() {
        const name = this.getDebugName();
        return 'From Event' + (name ? `: ${name}` : '');
    }
    onFirstObserverAdded() {
        this._subscription = this.event(this.handleEvent);
    }
    onLastObserverRemoved() {
        this._subscription.dispose();
        this._subscription = undefined;
        this._hasValue = false;
        this._value = undefined;
    }
    get() {
        if (this._subscription) {
            if (!this._hasValue) {
                this.handleEvent(undefined);
            }
            return this._value;
        }
        else {
            // no cache, as there are no subscribers to keep it updated
            const value = this._getValue(undefined);
            return value;
        }
    }
    debugSetValue(value) {
        this._value = value;
    }
}
(function (observableFromEvent) {
    observableFromEvent.Observer = FromEventObservable;
    function batchEventsGlobally(tx, fn) {
        let didSet = false;
        if (FromEventObservable.globalTransaction === undefined) {
            FromEventObservable.globalTransaction = tx;
            didSet = true;
        }
        try {
            fn();
        }
        finally {
            if (didSet) {
                FromEventObservable.globalTransaction = undefined;
            }
        }
    }
    observableFromEvent.batchEventsGlobally = batchEventsGlobally;
})(observableFromEvent || (observableFromEvent = {}));
export function observableSignalFromEvent(owner, event) {
    return new FromEventObservableSignal(typeof owner === 'string' ? owner : new DebugNameData(owner, undefined, undefined), event);
}
class FromEventObservableSignal extends BaseObservable {
    constructor(debugNameDataOrName, event) {
        super();
        this.event = event;
        this.handleEvent = () => {
            transaction((tx) => {
                for (const o of this._observers) {
                    tx.updateObserver(o, this);
                    o.handleChange(this, undefined);
                }
            }, () => this.debugName);
        };
        this.debugName = typeof debugNameDataOrName === 'string'
            ? debugNameDataOrName
            : debugNameDataOrName.getDebugName(this) ?? 'Observable Signal From Event';
    }
    onFirstObserverAdded() {
        this.subscription = this.event(this.handleEvent);
    }
    onLastObserverRemoved() {
        this.subscription.dispose();
        this.subscription = undefined;
    }
    get() {
        // NO OP
    }
}
export function observableSignal(debugNameOrOwner) {
    if (typeof debugNameOrOwner === 'string') {
        return new ObservableSignal(debugNameOrOwner);
    }
    else {
        return new ObservableSignal(undefined, debugNameOrOwner);
    }
}
class ObservableSignal extends BaseObservable {
    get debugName() {
        return new DebugNameData(this._owner, this._debugName, undefined).getDebugName(this) ?? 'Observable Signal';
    }
    toString() {
        return this.debugName;
    }
    constructor(_debugName, _owner) {
        super();
        this._debugName = _debugName;
        this._owner = _owner;
    }
    trigger(tx, change) {
        if (!tx) {
            transaction(tx => {
                this.trigger(tx, change);
            }, () => `Trigger signal ${this.debugName}`);
            return;
        }
        for (const o of this._observers) {
            tx.updateObserver(o, this);
            o.handleChange(this, change);
        }
    }
    get() {
        // NO OP
    }
}
export function signalFromObservable(owner, observable) {
    return derivedOpts({
        owner,
        equalsFn: () => false,
    }, reader => {
        observable.read(reader);
    });
}
/**
 * @deprecated Use `debouncedObservable` instead.
 */
export function debouncedObservableDeprecated(observable, debounceMs, disposableStore) {
    const debouncedObservable = observableValue('debounced', undefined);
    let timeout = undefined;
    disposableStore.add(autorun(reader => {
        /** @description debounce */
        const value = observable.read(reader);
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            transaction(tx => {
                debouncedObservable.set(value, tx);
            });
        }, debounceMs);
    }));
    return debouncedObservable;
}
/**
 * Creates an observable that debounces the input observable.
 */
export function debouncedObservable(observable, debounceMs) {
    let hasValue = false;
    let lastValue;
    let timeout = undefined;
    return observableFromEvent(cb => {
        const d = autorun(reader => {
            const value = observable.read(reader);
            if (!hasValue) {
                hasValue = true;
                lastValue = value;
            }
            else {
                if (timeout) {
                    clearTimeout(timeout);
                }
                timeout = setTimeout(() => {
                    lastValue = value;
                    cb();
                }, debounceMs);
            }
        });
        return {
            dispose() {
                d.dispose();
                hasValue = false;
                lastValue = undefined;
            },
        };
    }, () => {
        if (hasValue) {
            return lastValue;
        }
        else {
            return observable.get();
        }
    });
}
export function wasEventTriggeredRecently(event, timeoutMs, disposableStore) {
    const observable = observableValue('triggeredRecently', false);
    let timeout = undefined;
    disposableStore.add(event(() => {
        observable.set(true, undefined);
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            observable.set(false, undefined);
        }, timeoutMs);
    }));
    return observable;
}
/**
 * This makes sure the observable is being observed and keeps its cache alive.
 */
export function keepObserved(observable) {
    const o = new KeepAliveObserver(false, undefined);
    observable.addObserver(o);
    return toDisposable(() => {
        observable.removeObserver(o);
    });
}
_setKeepObserved(keepObserved);
/**
 * This converts the given observable into an autorun.
 */
export function recomputeInitiallyAndOnChange(observable, handleValue) {
    const o = new KeepAliveObserver(true, handleValue);
    observable.addObserver(o);
    try {
        o.beginUpdate(observable);
    }
    finally {
        o.endUpdate(observable);
    }
    return toDisposable(() => {
        observable.removeObserver(o);
    });
}
_setRecomputeInitiallyAndOnChange(recomputeInitiallyAndOnChange);
export class KeepAliveObserver {
    constructor(_forceRecompute, _handleValue) {
        this._forceRecompute = _forceRecompute;
        this._handleValue = _handleValue;
        this._counter = 0;
    }
    beginUpdate(observable) {
        this._counter++;
    }
    endUpdate(observable) {
        if (this._counter === 1 && this._forceRecompute) {
            if (this._handleValue) {
                this._handleValue(observable.get());
            }
            else {
                observable.reportChanges();
            }
        }
        this._counter--;
    }
    handlePossibleChange(observable) {
        // NO OP
    }
    handleChange(observable, change) {
        // NO OP
    }
}
export function derivedObservableWithCache(owner, computeFn) {
    let lastValue = undefined;
    const observable = derivedOpts({ owner, debugReferenceFn: computeFn }, reader => {
        lastValue = computeFn(reader, lastValue);
        return lastValue;
    });
    return observable;
}
export function derivedObservableWithWritableCache(owner, computeFn) {
    let lastValue = undefined;
    const onChange = observableSignal('derivedObservableWithWritableCache');
    const observable = derived(owner, reader => {
        onChange.read(reader);
        lastValue = computeFn(reader, lastValue);
        return lastValue;
    });
    return Object.assign(observable, {
        clearCache: (tx) => {
            lastValue = undefined;
            onChange.trigger(tx);
        },
        setCache: (newValue, tx) => {
            lastValue = newValue;
            onChange.trigger(tx);
        }
    });
}
/**
 * When the items array changes, referential equal items are not mapped again.
 */
export function mapObservableArrayCached(owner, items, map, keySelector) {
    let m = new ArrayMap(map, keySelector);
    const self = derivedOpts({
        debugReferenceFn: map,
        owner,
        onLastObserverRemoved: () => {
            m.dispose();
            m = new ArrayMap(map);
        }
    }, (reader) => {
        m.setItems(items.read(reader));
        return m.getItems();
    });
    return self;
}
class ArrayMap {
    constructor(_map, _keySelector) {
        this._map = _map;
        this._keySelector = _keySelector;
        this._cache = new Map();
        this._items = [];
    }
    dispose() {
        this._cache.forEach(entry => entry.store.dispose());
        this._cache.clear();
    }
    setItems(items) {
        const newItems = [];
        const itemsToRemove = new Set(this._cache.keys());
        for (const item of items) {
            const key = this._keySelector ? this._keySelector(item) : item;
            let entry = this._cache.get(key);
            if (!entry) {
                const store = new DisposableStore();
                const out = this._map(item, store);
                entry = { out, store };
                this._cache.set(key, entry);
            }
            else {
                itemsToRemove.delete(key);
            }
            newItems.push(entry.out);
        }
        for (const item of itemsToRemove) {
            const entry = this._cache.get(item);
            entry.store.dispose();
            this._cache.delete(item);
        }
        this._items = newItems;
    }
    getItems() {
        return this._items;
    }
}
export class ValueWithChangeEventFromObservable {
    constructor(observable) {
        this.observable = observable;
    }
    get onDidChange() {
        return Event.fromObservableLight(this.observable);
    }
    get value() {
        return this.observable.get();
    }
}
export function observableFromValueWithChangeEvent(owner, value) {
    if (value instanceof ValueWithChangeEventFromObservable) {
        return value.observable;
    }
    return observableFromEvent(owner, value.onDidChange, () => value.value);
}
/**
 * Creates an observable that has the latest changed value of the given observables.
 * Initially (and when not observed), it has the value of the last observable.
 * When observed and any of the observables change, it has the value of the last changed observable.
 * If multiple observables change in the same transaction, the last observable wins.
*/
export function latestChangedValue(owner, observables) {
    if (observables.length === 0) {
        throw new BugIndicatingError();
    }
    let hasLastChangedValue = false;
    let lastChangedValue = undefined;
    const result = observableFromEvent(owner, cb => {
        const store = new DisposableStore();
        for (const o of observables) {
            store.add(autorunOpts({ debugName: () => getDebugName(result, new DebugNameData(owner, undefined, undefined)) + '.updateLastChangedValue' }, reader => {
                hasLastChangedValue = true;
                lastChangedValue = o.read(reader);
                cb();
            }));
        }
        store.add({
            dispose() {
                hasLastChangedValue = false;
                lastChangedValue = undefined;
            },
        });
        return store;
    }, () => {
        if (hasLastChangedValue) {
            return lastChangedValue;
        }
        else {
            return observables[observables.length - 1].get();
        }
    });
    return result;
}
/**
 * Works like a derived.
 * However, if the value is not undefined, it is cached and will not be recomputed anymore.
 * In that case, the derived will unsubscribe from its dependencies.
*/
export function derivedConstOnceDefined(owner, fn) {
    return derivedObservableWithCache(owner, (reader, lastValue) => lastValue ?? fn(reader));
}
export function runOnChange(observable, cb) {
    let _previousValue;
    return autorunWithStoreHandleChanges({
        createEmptyChangeSummary: () => ({ deltas: [], didChange: false }),
        handleChange: (context, changeSummary) => {
            if (context.didChange(observable)) {
                const e = context.change;
                if (e !== undefined) {
                    changeSummary.deltas.push(e);
                }
                changeSummary.didChange = true;
            }
            return true;
        },
    }, (reader, changeSummary) => {
        const value = observable.read(reader);
        const previousValue = _previousValue;
        if (changeSummary.didChange) {
            _previousValue = value;
            cb(value, previousValue, changeSummary.deltas);
        }
    });
}
export function runOnChangeWithStore(observable, cb) {
    const store = new DisposableStore();
    const disposable = runOnChange(observable, (value, previousValue, deltas) => {
        store.clear();
        cb(value, previousValue, deltas, store);
    });
    return {
        dispose() {
            disposable.dispose();
            store.dispose();
        }
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vb2JzZXJ2YWJsZUludGVybmFsL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxjQUFjLEVBQUUsb0JBQW9CLEVBQXdFLGdCQUFnQixFQUFFLGlDQUFpQyxFQUFFLGVBQWUsRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQzFPLE9BQU8sRUFBRSxhQUFhLEVBQThCLFlBQVksR0FBRyxNQUFNLGdCQUFnQixDQUFDO0FBQzFGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxlQUFlLEVBQW9CLEtBQUssRUFBc0MsWUFBWSxFQUFFLFlBQVksRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3RLLE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3BELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUVqRDs7R0FFRztBQUNILE1BQU0sVUFBVSxlQUFlLENBQUksS0FBUTtJQUMxQyxPQUFPLElBQUksZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ25DLENBQUM7QUFFRCxNQUFNLGVBQW1CLFNBQVEsb0JBQTZCO0lBQzdELFlBQTZCLEtBQVE7UUFDcEMsS0FBSyxFQUFFLENBQUM7UUFEb0IsVUFBSyxHQUFMLEtBQUssQ0FBRztJQUVyQyxDQUFDO0lBRUQsSUFBb0IsU0FBUztRQUM1QixPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUN4QixDQUFDO0lBRU0sR0FBRztRQUNULE9BQU8sSUFBSSxDQUFD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