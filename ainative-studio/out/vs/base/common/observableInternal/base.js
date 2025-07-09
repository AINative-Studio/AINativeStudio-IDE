/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DebugNameData, getFunctionName } from './debugName.js';
import { strictEquals } from './commonFacade/deps.js';
import { getLogger, logObservable } from './logging/logging.js';
import { onUnexpectedError } from '../errors.js';
let _recomputeInitiallyAndOnChange;
export function _setRecomputeInitiallyAndOnChange(recomputeInitiallyAndOnChange) {
    _recomputeInitiallyAndOnChange = recomputeInitiallyAndOnChange;
}
let _keepObserved;
export function _setKeepObserved(keepObserved) {
    _keepObserved = keepObserved;
}
let _derived;
/**
 * @internal
 * This is to allow splitting files.
*/
export function _setDerivedOpts(derived) {
    _derived = derived;
}
export class ConvenientObservable {
    get TChange() { return null; }
    reportChanges() {
        this.get();
    }
    /** @sealed */
    read(reader) {
        if (reader) {
            return reader.readObservable(this);
        }
        else {
            return this.get();
        }
    }
    map(fnOrOwner, fnOrUndefined) {
        const owner = fnOrUndefined === undefined ? undefined : fnOrOwner;
        const fn = fnOrUndefined === undefined ? fnOrOwner : fnOrUndefined;
        return _derived({
            owner,
            debugName: () => {
                const name = getFunctionName(fn);
                if (name !== undefined) {
                    return name;
                }
                // regexp to match `x => x.y` or `x => x?.y` where x and y can be arbitrary identifiers (uses backref):
                const regexp = /^\s*\(?\s*([a-zA-Z_$][a-zA-Z_$0-9]*)\s*\)?\s*=>\s*\1(?:\??)\.([a-zA-Z_$][a-zA-Z_$0-9]*)\s*$/;
                const match = regexp.exec(fn.toString());
                if (match) {
                    return `${this.debugName}.${match[2]}`;
                }
                if (!owner) {
                    return `${this.debugName} (mapped)`;
                }
                return undefined;
            },
            debugReferenceFn: fn,
        }, (reader) => fn(this.read(reader), reader));
    }
    /**
     * @sealed
     * Converts an observable of an observable value into a direct observable of the value.
    */
    flatten() {
        return _derived({
            owner: undefined,
            debugName: () => `${this.debugName} (flattened)`,
        }, (reader) => this.read(reader).read(reader));
    }
    recomputeInitiallyAndOnChange(store, handleValue) {
        store.add(_recomputeInitiallyAndOnChange(this, handleValue));
        return this;
    }
    /**
     * Ensures that this observable is observed. This keeps the cache alive.
     * However, in case of deriveds, it does not force eager evaluation (only when the value is read/get).
     * Use `recomputeInitiallyAndOnChange` for eager evaluation.
     */
    keepObserved(store) {
        store.add(_keepObserved(this));
        return this;
    }
    get debugValue() {
        return this.get();
    }
}
export class BaseObservable extends ConvenientObservable {
    constructor() {
        super();
        this._observers = new Set();
        getLogger()?.handleObservableCreated(this);
    }
    addObserver(observer) {
        const len = this._observers.size;
        this._observers.add(observer);
        if (len === 0) {
            this.onFirstObserverAdded();
        }
        if (len !== this._observers.size) {
            getLogger()?.handleOnListenerCountChanged(this, this._observers.size);
        }
    }
    removeObserver(observer) {
        const deleted = this._observers.delete(observer);
        if (deleted && this._observers.size === 0) {
            this.onLastObserverRemoved();
        }
        if (deleted) {
            getLogger()?.handleOnListenerCountChanged(this, this._observers.size);
        }
    }
    onFirstObserverAdded() { }
    onLastObserverRemoved() { }
    log() {
        const hadLogger = !!getLogger();
        logObservable(this);
        if (!hadLogger) {
            getLogger()?.handleObservableCreated(this);
        }
        return this;
    }
    debugGetObservers() {
        return this._observers;
    }
}
/**
 * Starts a transaction in which many observables can be changed at once.
 * {@link fn} should start with a JS Doc using `@description` to give the transaction a debug name.
 * Reaction run on demand or when the transaction ends.
 */
export function transaction(fn, getDebugName) {
    const tx = new TransactionImpl(fn, getDebugName);
    try {
        fn(tx);
    }
    finally {
        tx.finish();
    }
}
let _globalTransaction = undefined;
export function globalTransaction(fn) {
    if (_globalTransaction) {
        fn(_globalTransaction);
    }
    else {
        const tx = new TransactionImpl(fn, undefined);
        _globalTransaction = tx;
        try {
            fn(tx);
        }
        finally {
            tx.finish(); // During finish, more actions might be added to the transaction.
            // Which is why we only clear the global transaction after finish.
            _globalTransaction = undefined;
        }
    }
}
export async function asyncTransaction(fn, getDebugName) {
    const tx = new TransactionImpl(fn, getDebugName);
    try {
        await fn(tx);
    }
    finally {
        tx.finish();
    }
}
/**
 * Allows to chain transactions.
 */
export function subtransaction(tx, fn, getDebugName) {
    if (!tx) {
        transaction(fn, getDebugName);
    }
    else {
        fn(tx);
    }
}
export class TransactionImpl {
    constructor(_fn, _getDebugName) {
        this._fn = _fn;
        this._getDebugName = _getDebugName;
        this._updatingObservers = [];
        getLogger()?.handleBeginTransaction(this);
    }
    getDebugName() {
        if (this._getDebugName) {
            return this._getDebugName();
        }
        return getFunctionName(this._fn);
    }
    updateObserver(observer, observable) {
        if (!this._updatingObservers) {
            // This happens when a transaction is used in a callback or async function.
            // If an async transaction is used, make sure the promise awaits all users of the transaction (e.g. no race).
            handleBugIndicatingErrorRecovery('Transaction already finished!');
            // Error recovery
            transaction(tx => {
                tx.updateObserver(observer, observable);
            });
            return;
        }
        // When this gets called while finish is active, they will still get considered
        this._updatingObservers.push({ observer, observable });
        observer.beginUpdate(observable);
    }
    finish() {
        const updatingObservers = this._updatingObservers;
        if (!updatingObservers) {
            handleBugIndicatingErrorRecovery('transaction.finish() has already been called!');
            return;
        }
        for (let i = 0; i < updatingObservers.length; i++) {
            const { observer, observable } = updatingObservers[i];
            observer.endUpdate(observable);
        }
        // Prevent anyone from updating observers from now on.
        this._updatingObservers = null;
        getLogger()?.handleEndTransaction(this);
    }
    debugGetUpdatingObservers() {
        return this._updatingObservers;
    }
}
/**
 * This function is used to indicate that the caller recovered from an error that indicates a bug.
*/
function handleBugIndicatingErrorRecovery(message) {
    const err = new Error('BugIndicatingErrorRecovery: ' + message);
    onUnexpectedError(err);
    console.error('recovered from an error that indicates a bug', err);
}
export function observableValue(nameOrOwner, initialValue) {
    let debugNameData;
    if (typeof nameOrOwner === 'string') {
        debugNameData = new DebugNameData(undefined, nameOrOwner, undefined);
    }
    else {
        debugNameData = new DebugNameData(nameOrOwner, undefined, undefined);
    }
    return new ObservableValue(debugNameData, initialValue, strictEquals);
}
export class ObservableValue extends BaseObservable {
    get debugName() {
        return this._debugNameData.getDebugName(this) ?? 'ObservableValue';
    }
    constructor(_debugNameData, initialValue, _equalityComparator) {
        super();
        this._debugNameData = _debugNameData;
        this._equalityComparator = _equalityComparator;
        this._value = initialValue;
        getLogger()?.handleObservableUpdated(this, { hadValue: false, newValue: initialValue, change: undefined, didChange: true, oldValue: undefined });
    }
    get() {
        return this._value;
    }
    set(value, tx, change) {
        if (change === undefined && this._equalityComparator(this._value, value)) {
            return;
        }
        let _tx;
        if (!tx) {
            tx = _tx = new TransactionImpl(() => { }, () => `Setting ${this.debugName}`);
        }
        try {
            const oldValue = this._value;
            this._setValue(value);
            getLogger()?.handleObservableUpdated(this, { oldValue, newValue: value, change, didChange: true, hadValue: true });
            for (const observer of this._observers) {
                tx.updateObserver(observer, this);
                observer.handleChange(this, change);
            }
        }
        finally {
            if (_tx) {
                _tx.finish();
            }
        }
    }
    toString() {
        return `${this.debugName}: ${this._value}`;
    }
    _setValue(newValue) {
        this._value = newValue;
    }
    debugGetState() {
        return {
            value: this._value,
        };
    }
    debugSetValue(value) {
        this._value = value;
    }
}
/**
 * A disposable observable. When disposed, its value is also disposed.
 * When a new value is set, the previous value is disposed.
 */
export function disposableObservableValue(nameOrOwner, initialValue) {
    let debugNameData;
    if (typeof nameOrOwner === 'string') {
        debugNameData = new DebugNameData(undefined, nameOrOwner, undefined);
    }
    else {
        debugNameData = new DebugNameData(nameOrOwner, undefined, undefined);
    }
    return new DisposableObservableValue(debugNameData, initialValue, strictEquals);
}
export class DisposableObservableValue extends ObservableValue {
    _setValue(newValue) {
        if (this._value === newValue) {
            return;
        }
        if (this._value) {
            this._value.dispose();
        }
        this._value = newValue;
    }
    dispose() {
        this._value?.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9vYnNlcnZhYmxlSW50ZXJuYWwvYmFzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFjLGVBQWUsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQzVFLE9BQU8sRUFBa0QsWUFBWSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFdEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUVoRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxjQUFjLENBQUM7QUEyS2pELElBQUksOEJBQW9FLENBQUM7QUFDekUsTUFBTSxVQUFVLGlDQUFpQyxDQUFDLDZCQUFvRTtJQUNySCw4QkFBOEIsR0FBRyw2QkFBNkIsQ0FBQztBQUNoRSxDQUFDO0FBRUQsSUFBSSxhQUFrQyxDQUFDO0FBQ3ZDLE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxZQUFrQztJQUNsRSxhQUFhLEdBQUcsWUFBWSxDQUFDO0FBQzlCLENBQUM7QUFFRCxJQUFJLFFBQTRCLENBQUM7QUFDakM7OztFQUdFO0FBQ0YsTUFBTSxVQUFVLGVBQWUsQ0FBQyxPQUF3QjtJQUN2RCxRQUFRLEdBQUcsT0FBTyxDQUFDO0FBQ3BCLENBQUM7QUFFRCxNQUFNLE9BQWdCLG9CQUFvQjtJQUN6QyxJQUFJLE9BQU8sS0FBYyxPQUFPLElBQUssQ0FBQyxDQUFDLENBQUM7SUFJakMsYUFBYTtRQUNuQixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDWixDQUFDO0lBS0QsY0FBYztJQUNQLElBQUksQ0FBQyxNQUEyQjtRQUN0QyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osT0FBTyxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BDLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDbkIsQ0FBQztJQUNGLENBQUM7SUFLTSxHQUFHLENBQU8sU0FBNkQsRUFBRSxhQUFtRDtRQUNsSSxNQUFNLEtBQUssR0FBRyxhQUFhLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQXVCLENBQUM7UUFDaEYsTUFBTSxFQUFFLEdBQUcsYUFBYSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBZ0QsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDO1FBRTFHLE9BQU8sUUFBUSxDQUNkO1lBQ0MsS0FBSztZQUNMLFNBQVMsRUFBRSxHQUFHLEVBQUU7Z0JBQ2YsTUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNqQyxJQUFJLElBQUksS0FBSyxTQUFTLEVBQUUsQ0FBQztvQkFDeEIsT0FBTyxJQUFJLENBQUM7Z0JBQ2IsQ0FBQztnQkFFRCx1R0FBdUc7Z0JBQ3ZHLE1BQU0sTUFBTSxHQUFHLDZGQUE2RixDQUFDO2dCQUM3RyxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO2dCQUN6QyxJQUFJLEtBQUssRUFBRSxDQUFDO29CQUNYLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUN4QyxDQUFDO2dCQUNELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDWixPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsV0FBVyxDQUFDO2dCQUNyQyxDQUFDO2dCQUNELE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7WUFDRCxnQkFBZ0IsRUFBRSxFQUFFO1NBQ3BCLEVBQ0QsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUN6QyxDQUFDO0lBQ0gsQ0FBQztJQUlEOzs7TUFHRTtJQUNLLE9BQU87UUFDYixPQUFPLFFBQVEsQ0FDZDtZQUNDLEtBQUssRUFBRSxTQUFTO1lBQ2hCLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLGNBQWM7U0FDaEQsRUFDRCxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQzFDLENBQUM7SUFDSCxDQUFDO0lBRU0sNkJBQTZCLENBQUMsS0FBc0IsRUFBRSxXQUFnQztRQUM1RixLQUFLLENBQUMsR0FBRyxDQUFDLDhCQUErQixDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQzlELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVEOzs7O09BSUc7SUFDSSxZQUFZLENBQUMsS0FBc0I7UUFDekMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxhQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNoQyxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFJRCxJQUFjLFVBQVU7UUFDdkIsT0FBTyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDbkIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFnQixjQUFrQyxTQUFRLG9CQUFnQztJQUcvRjtRQUNDLEtBQUssRUFBRSxDQUFDO1FBSFUsZUFBVSxHQUFHLElBQUksR0FBRyxFQUFhLENBQUM7UUFJcEQsU0FBUyxFQUFFLEVBQUUsdUJBQXVCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVNLFdBQVcsQ0FBQyxRQUFtQjtRQUNyQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztRQUNqQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM5QixJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNmLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBQzdCLENBQUM7UUFDRCxJQUFJLEdBQUcsS0FBSyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2xDLFNBQVMsRUFBRSxFQUFFLDRCQUE0QixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZFLENBQUM7SUFDRixDQUFDO0lBRU0sY0FBYyxDQUFDLFFBQW1CO1FBQ3hDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2pELElBQUksT0FBTyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzNDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBQzlCLENBQUM7UUFDRCxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsU0FBUyxFQUFFLEVBQUUsNEJBQTRCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkUsQ0FBQztJQUNGLENBQUM7SUFFUyxvQkFBb0IsS0FBVyxDQUFDO0lBQ2hDLHFCQUFxQixLQUFXLENBQUM7SUFFM0IsR0FBRztRQUNsQixNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDaEMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixTQUFTLEVBQUUsRUFBRSx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRU0saUJBQWlCO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztJQUN4QixDQUFDO0NBQ0Q7QUFFRDs7OztHQUlHO0FBRUgsTUFBTSxVQUFVLFdBQVcsQ0FBQyxFQUE4QixFQUFFLFlBQTJCO0lBQ3RGLE1BQU0sRUFBRSxHQUFHLElBQUksZUFBZSxDQUFDLEVBQUUsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUNqRCxJQUFJLENBQUM7UUFDSixFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDUixDQUFDO1lBQVMsQ0FBQztRQUNWLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNiLENBQUM7QUFDRixDQUFDO0FBRUQsSUFBSSxrQkFBa0IsR0FBNkIsU0FBUyxDQUFDO0FBRTdELE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxFQUE4QjtJQUMvRCxJQUFJLGtCQUFrQixFQUFFLENBQUM7UUFDeEIsRUFBRSxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDeEIsQ0FBQztTQUFNLENBQUM7UUFDUCxNQUFNLEVBQUUsR0FBRyxJQUFJLGVBQWUsQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDOUMsa0JBQWtCLEdBQUcsRUFBRSxDQUFDO1FBQ3hCLElBQUksQ0FBQztZQUNKLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNSLENBQUM7Z0JBQVMsQ0FBQztZQUNWLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLGlFQUFpRTtZQUM5RSxrRUFBa0U7WUFDbEUsa0JBQWtCLEdBQUcsU0FBUyxDQUFDO1FBQ2hDLENBQUM7SUFDRixDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sQ0FBQyxLQUFLLFVBQVUsZ0JBQWdCLENBQUMsRUFBdUMsRUFBRSxZQUEyQjtJQUMxRyxNQUFNLEVBQUUsR0FBRyxJQUFJLGVBQWUsQ0FBQyxFQUFFLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDakQsSUFBSSxDQUFDO1FBQ0osTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDZCxDQUFDO1lBQVMsQ0FBQztRQUNWLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNiLENBQUM7QUFDRixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsY0FBYyxDQUFDLEVBQTRCLEVBQUUsRUFBOEIsRUFBRSxZQUEyQjtJQUN2SCxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDVCxXQUFXLENBQUMsRUFBRSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQy9CLENBQUM7U0FBTSxDQUFDO1FBQ1AsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ1IsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLE9BQU8sZUFBZTtJQUczQixZQUE0QixHQUFhLEVBQW1CLGFBQTRCO1FBQTVELFFBQUcsR0FBSCxHQUFHLENBQVU7UUFBbUIsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFGaEYsdUJBQWtCLEdBQW1FLEVBQUUsQ0FBQztRQUcvRixTQUFTLEVBQUUsRUFBRSxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBRU0sWUFBWTtRQUNsQixJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN4QixPQUFPLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUM3QixDQUFDO1FBQ0QsT0FBTyxlQUFlLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFTSxjQUFjLENBQUMsUUFBbUIsRUFBRSxVQUE0QjtRQUN0RSxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDOUIsMkVBQTJFO1lBQzNFLDZHQUE2RztZQUM3RyxnQ0FBZ0MsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1lBQ2xFLGlCQUFpQjtZQUNqQixXQUFXLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQ2hCLEVBQUUsQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ3pDLENBQUMsQ0FBQyxDQUFDO1lBQ0gsT0FBTztRQUNSLENBQUM7UUFFRCwrRUFBK0U7UUFDL0UsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZELFFBQVEsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVNLE1BQU07UUFDWixNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQztRQUNsRCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUN4QixnQ0FBZ0MsQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDO1lBQ2xGLE9BQU87UUFDUixDQUFDO1FBRUQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ25ELE1BQU0sRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLEdBQUcsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdEQsUUFBUSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNoQyxDQUFDO1FBQ0Qsc0RBQXNEO1FBQ3RELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUM7UUFDL0IsU0FBUyxFQUFFLEVBQUUsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUVNLHlCQUF5QjtRQUMvQixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQztJQUNoQyxDQUFDO0NBQ0Q7QUFFRDs7RUFFRTtBQUNGLFNBQVMsZ0NBQWdDLENBQUMsT0FBZTtJQUN4RCxNQUFNLEdBQUcsR0FBRyxJQUFJLEtBQUssQ0FBQyw4QkFBOEIsR0FBRyxPQUFPLENBQUMsQ0FBQztJQUNoRSxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN2QixPQUFPLENBQUMsS0FBSyxDQUFDLDhDQUE4QyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ3BFLENBQUM7QUFnQkQsTUFBTSxVQUFVLGVBQWUsQ0FBb0IsV0FBNEIsRUFBRSxZQUFlO0lBQy9GLElBQUksYUFBNEIsQ0FBQztJQUNqQyxJQUFJLE9BQU8sV0FBVyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ3JDLGFBQWEsR0FBRyxJQUFJLGFBQWEsQ0FBQyxTQUFTLEVBQUUsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7U0FBTSxDQUFDO1FBQ1AsYUFBYSxHQUFHLElBQUksYUFBYSxDQUFDLFdBQVcsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDdEUsQ0FBQztJQUNELE9BQU8sSUFBSSxlQUFlLENBQUMsYUFBYSxFQUFFLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQztBQUN2RSxDQUFDO0FBRUQsTUFBTSxPQUFPLGVBQ1osU0FBUSxjQUEwQjtJQUlsQyxJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLGlCQUFpQixDQUFDO0lBQ3BFLENBQUM7SUFFRCxZQUNrQixjQUE2QixFQUM5QyxZQUFlLEVBQ0UsbUJBQXdDO1FBRXpELEtBQUssRUFBRSxDQUFDO1FBSlMsbUJBQWMsR0FBZCxjQUFjLENBQWU7UUFFN0Isd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQUd6RCxJQUFJLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQztRQUUzQixTQUFTLEVBQUUsRUFBRSx1QkFBdUIsQ0FBQyxJQUFJLEVBQUUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO0lBQ2xKLENBQUM7SUFDZSxHQUFHO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNwQixDQUFDO0lBRU0sR0FBRyxDQUFDLEtBQVEsRUFBRSxFQUE0QixFQUFFLE1BQWU7UUFDakUsSUFBSSxNQUFNLEtBQUssU0FBUyxJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDMUUsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLEdBQWdDLENBQUM7UUFDckMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ1QsRUFBRSxHQUFHLEdBQUcsR0FBRyxJQUFJLGVBQWUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsV0FBVyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztRQUM5RSxDQUFDO1FBQ0QsSUFBSSxDQUFDO1lBQ0osTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUM3QixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3RCLFNBQVMsRUFBRSxFQUFFLHVCQUF1QixDQUFDLElBQUksRUFBRSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBRW5ILEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUN4QyxFQUFFLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDbEMsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDckMsQ0FBQztRQUNGLENBQUM7Z0JBQVMsQ0FBQztZQUNWLElBQUksR0FBRyxFQUFFLENBQUM7Z0JBQ1QsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2QsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRVEsUUFBUTtRQUNoQixPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsS0FBSyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDNUMsQ0FBQztJQUVTLFNBQVMsQ0FBQyxRQUFXO1FBQzlCLElBQUksQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDO0lBQ3hCLENBQUM7SUFFTSxhQUFhO1FBQ25CLE9BQU87WUFDTixLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU07U0FDbEIsQ0FBQztJQUNILENBQUM7SUFFTSxhQUFhLENBQUMsS0FBYztRQUNsQyxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQVUsQ0FBQztJQUMxQixDQUFDO0NBQ0Q7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUseUJBQXlCLENBQW9ELFdBQTRCLEVBQUUsWUFBZTtJQUN6SSxJQUFJLGFBQTRCLENBQUM7SUFDakMsSUFBSSxPQUFPLFdBQVcsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUNyQyxhQUFhLEdBQUcsSUFBSSxhQUFhLENBQUMsU0FBUyxFQUFFLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUN0RSxDQUFDO1NBQU0sQ0FBQztRQUNQLGFBQWEsR0FBRyxJQUFJLGFBQWEsQ0FBQyxXQUFXLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7SUFDRCxPQUFPLElBQUkseUJBQXlCLENBQUMsYUFBYSxFQUFFLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQztBQUNqRixDQUFDO0FBRUQsTUFBTSxPQUFPLHlCQUE2RSxTQUFRLGVBQTJCO0lBQ3pHLFNBQVMsQ0FBQyxRQUFXO1FBQ3ZDLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUM5QixPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdkIsQ0FBQztRQUNELElBQUksQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDO0lBQ3hCLENBQUM7SUFFTSxPQUFPO1FBQ2IsSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQztJQUN4QixDQUFDO0NBQ0QifQ==