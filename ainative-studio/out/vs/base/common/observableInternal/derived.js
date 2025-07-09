/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseObservable, _setDerivedOpts, } from './base.js';
import { DebugNameData } from './debugName.js';
import { BugIndicatingError, DisposableStore, assertFn, onBugIndicatingError, strictEquals } from './commonFacade/deps.js';
import { getLogger } from './logging/logging.js';
export function derived(computeFnOrOwner, computeFn) {
    if (computeFn !== undefined) {
        return new Derived(new DebugNameData(computeFnOrOwner, undefined, computeFn), computeFn, undefined, undefined, undefined, strictEquals);
    }
    return new Derived(new DebugNameData(undefined, undefined, computeFnOrOwner), computeFnOrOwner, undefined, undefined, undefined, strictEquals);
}
export function derivedWithSetter(owner, computeFn, setter) {
    return new DerivedWithSetter(new DebugNameData(owner, undefined, computeFn), computeFn, undefined, undefined, undefined, strictEquals, setter);
}
export function derivedOpts(options, computeFn) {
    return new Derived(new DebugNameData(options.owner, options.debugName, options.debugReferenceFn), computeFn, undefined, undefined, options.onLastObserverRemoved, options.equalsFn ?? strictEquals);
}
_setDerivedOpts(derivedOpts);
/**
 * Represents an observable that is derived from other observables.
 * The value is only recomputed when absolutely needed.
 *
 * {@link computeFn} should start with a JS Doc using `@description` to name the derived.
 *
 * Use `createEmptyChangeSummary` to create a "change summary" that can collect the changes.
 * Use `handleChange` to add a reported change to the change summary.
 * The compute function is given the last change summary.
 * The change summary is discarded after the compute function was called.
 *
 * @see derived
 */
export function derivedHandleChanges(options, computeFn) {
    return new Derived(new DebugNameData(options.owner, options.debugName, undefined), computeFn, options.createEmptyChangeSummary, options.handleChange, undefined, options.equalityComparer ?? strictEquals);
}
export function derivedWithStore(computeFnOrOwner, computeFnOrUndefined) {
    let computeFn;
    let owner;
    if (computeFnOrUndefined === undefined) {
        computeFn = computeFnOrOwner;
        owner = undefined;
    }
    else {
        owner = computeFnOrOwner;
        computeFn = computeFnOrUndefined;
    }
    // Intentionally re-assigned in case an inactive observable is re-used later
    // eslint-disable-next-line local/code-no-potentially-unsafe-disposables
    let store = new DisposableStore();
    return new Derived(new DebugNameData(owner, undefined, computeFn), r => {
        if (store.isDisposed) {
            store = new DisposableStore();
        }
        else {
            store.clear();
        }
        return computeFn(r, store);
    }, undefined, undefined, () => store.dispose(), strictEquals);
}
export function derivedDisposable(computeFnOrOwner, computeFnOrUndefined) {
    let computeFn;
    let owner;
    if (computeFnOrUndefined === undefined) {
        computeFn = computeFnOrOwner;
        owner = undefined;
    }
    else {
        owner = computeFnOrOwner;
        computeFn = computeFnOrUndefined;
    }
    let store = undefined;
    return new Derived(new DebugNameData(owner, undefined, computeFn), r => {
        if (!store) {
            store = new DisposableStore();
        }
        else {
            store.clear();
        }
        const result = computeFn(r);
        if (result) {
            store.add(result);
        }
        return result;
    }, undefined, undefined, () => {
        if (store) {
            store.dispose();
            store = undefined;
        }
    }, strictEquals);
}
export var DerivedState;
(function (DerivedState) {
    /** Initial state, no previous value, recomputation needed */
    DerivedState[DerivedState["initial"] = 0] = "initial";
    /**
     * A dependency could have changed.
     * We need to explicitly ask them if at least one dependency changed.
     */
    DerivedState[DerivedState["dependenciesMightHaveChanged"] = 1] = "dependenciesMightHaveChanged";
    /**
     * A dependency changed and we need to recompute.
     * After recomputation, we need to check the previous value to see if we changed as well.
     */
    DerivedState[DerivedState["stale"] = 2] = "stale";
    /**
     * No change reported, our cached value is up to date.
     */
    DerivedState[DerivedState["upToDate"] = 3] = "upToDate";
})(DerivedState || (DerivedState = {}));
export class Derived extends BaseObservable {
    get debugName() {
        return this._debugNameData.getDebugName(this) ?? '(anonymous)';
    }
    constructor(_debugNameData, _computeFn, createChangeSummary, _handleChange, _handleLastObserverRemoved = undefined, _equalityComparator) {
        super();
        this._debugNameData = _debugNameData;
        this._computeFn = _computeFn;
        this.createChangeSummary = createChangeSummary;
        this._handleChange = _handleChange;
        this._handleLastObserverRemoved = _handleLastObserverRemoved;
        this._equalityComparator = _equalityComparator;
        this._state = 0 /* DerivedState.initial */;
        this._value = undefined;
        this._updateCount = 0;
        this._dependencies = new Set();
        this._dependenciesToBeRemoved = new Set();
        this._changeSummary = undefined;
        this._isUpdating = false;
        this._isComputing = false;
        this._removedObserverToCallEndUpdateOn = null;
        // IReader Implementation
        this._isReaderValid = false;
        this._changeSummary = this.createChangeSummary?.();
    }
    onLastObserverRemoved() {
        /**
         * We are not tracking changes anymore, thus we have to assume
         * that our cache is invalid.
         */
        this._state = 0 /* DerivedState.initial */;
        this._value = undefined;
        getLogger()?.handleDerivedCleared(this);
        for (const d of this._dependencies) {
            d.removeObserver(this);
        }
        this._dependencies.clear();
        this._handleLastObserverRemoved?.();
    }
    get() {
        const checkEnabled = false; // TODO set to true
        if (this._isComputing && checkEnabled) {
            // investigate why this fails in the diff editor!
            throw new BugIndicatingError('Cyclic deriveds are not supported yet!');
        }
        if (this._observers.size === 0) {
            let result;
            // Without observers, we don't know when to clean up stuff.
            // Thus, we don't cache anything to prevent memory leaks.
            try {
                this._isReaderValid = true;
                result = this._computeFn(this, this.createChangeSummary?.());
            }
            finally {
                this._isReaderValid = false;
            }
            // Clear new dependencies
            this.onLastObserverRemoved();
            return result;
        }
        else {
            do {
                // We might not get a notification for a dependency that changed while it is updating,
                // thus we also have to ask all our depedencies if they changed in this case.
                if (this._state === 1 /* DerivedState.dependenciesMightHaveChanged */) {
                    for (const d of this._dependencies) {
                        /** might call {@link handleChange} indirectly, which could make us stale */
                        d.reportChanges();
                        if (this._state === 2 /* DerivedState.stale */) {
                            // The other dependencies will refresh on demand, so early break
                            break;
                        }
                    }
                }
                // We called report changes of all dependencies.
                // If we are still not stale, we can assume to be up to date again.
                if (this._state === 1 /* DerivedState.dependenciesMightHaveChanged */) {
                    this._state = 3 /* DerivedState.upToDate */;
                }
                if (this._state !== 3 /* DerivedState.upToDate */) {
                    this._recompute();
                }
                // In case recomputation changed one of our dependencies, we need to recompute again.
            } while (this._state !== 3 /* DerivedState.upToDate */);
            return this._value;
        }
    }
    _recompute() {
        const emptySet = this._dependenciesToBeRemoved;
        this._dependenciesToBeRemoved = this._dependencies;
        this._dependencies = emptySet;
        const hadValue = this._state !== 0 /* DerivedState.initial */;
        const oldValue = this._value;
        this._state = 3 /* DerivedState.upToDate */;
        let didChange = false;
        this._isComputing = true;
        try {
            const changeSummary = this._changeSummary;
            this._changeSummary = this.createChangeSummary?.();
            try {
                this._isReaderValid = true;
                /** might call {@link handleChange} indirectly, which could invalidate us */
                this._value = this._computeFn(this, changeSummary);
            }
            finally {
                this._isReaderValid = false;
                // We don't want our observed observables to think that they are (not even temporarily) not being observed.
                // Thus, we only unsubscribe from observables that are definitely not read anymore.
                for (const o of this._dependenciesToBeRemoved) {
                    o.removeObserver(this);
                }
                this._dependenciesToBeRemoved.clear();
            }
            didChange = hadValue && !(this._equalityComparator(oldValue, this._value));
            getLogger()?.handleObservableUpdated(this, {
                oldValue,
                newValue: this._value,
                change: undefined,
                didChange,
                hadValue,
            });
        }
        catch (e) {
            onBugIndicatingError(e);
        }
        this._isComputing = false;
        if (didChange) {
            for (const r of this._observers) {
                r.handleChange(this, undefined);
            }
        }
    }
    toString() {
        return `LazyDerived<${this.debugName}>`;
    }
    // IObserver Implementation
    beginUpdate(_observable) {
        if (this._isUpdating) {
            throw new BugIndicatingError('Cyclic deriveds are not supported yet!');
        }
        this._updateCount++;
        this._isUpdating = true;
        try {
            const propagateBeginUpdate = this._updateCount === 1;
            if (this._state === 3 /* DerivedState.upToDate */) {
                this._state = 1 /* DerivedState.dependenciesMightHaveChanged */;
                // If we propagate begin update, that will already signal a possible change.
                if (!propagateBeginUpdate) {
                    for (const r of this._observers) {
                        r.handlePossibleChange(this);
                    }
                }
            }
            if (propagateBeginUpdate) {
                for (const r of this._observers) {
                    r.beginUpdate(this); // This signals a possible change
                }
            }
        }
        finally {
            this._isUpdating = false;
        }
    }
    endUpdate(_observable) {
        this._updateCount--;
        if (this._updateCount === 0) {
            // End update could change the observer list.
            const observers = [...this._observers];
            for (const r of observers) {
                r.endUpdate(this);
            }
            if (this._removedObserverToCallEndUpdateOn) {
                const observers = [...this._removedObserverToCallEndUpdateOn];
                this._removedObserverToCallEndUpdateOn = null;
                for (const r of observers) {
                    r.endUpdate(this);
                }
            }
        }
        assertFn(() => this._updateCount >= 0);
    }
    handlePossibleChange(observable) {
        // In all other states, observers already know that we might have changed.
        if (this._state === 3 /* DerivedState.upToDate */ && this._dependencies.has(observable) && !this._dependenciesToBeRemoved.has(observable)) {
            this._state = 1 /* DerivedState.dependenciesMightHaveChanged */;
            for (const r of this._observers) {
                r.handlePossibleChange(this);
            }
        }
    }
    handleChange(observable, change) {
        if (this._dependencies.has(observable) && !this._dependenciesToBeRemoved.has(observable)) {
            getLogger()?.handleDerivedDependencyChanged(this, observable, change);
            let shouldReact = false;
            try {
                shouldReact = this._handleChange ? this._handleChange({
                    changedObservable: observable,
                    change,
                    didChange: (o) => o === observable,
                }, this._changeSummary) : true;
            }
            catch (e) {
                onBugIndicatingError(e);
            }
            const wasUpToDate = this._state === 3 /* DerivedState.upToDate */;
            if (shouldReact && (this._state === 1 /* DerivedState.dependenciesMightHaveChanged */ || wasUpToDate)) {
                this._state = 2 /* DerivedState.stale */;
                if (wasUpToDate) {
                    for (const r of this._observers) {
                        r.handlePossibleChange(this);
                    }
                }
            }
        }
    }
    readObservable(observable) {
        if (!this._isReaderValid) {
            throw new BugIndicatingError('The reader object cannot be used outside its compute function!');
        }
        // Subscribe before getting the value to enable caching
        observable.addObserver(this);
        /** This might call {@link handleChange} indirectly, which could invalidate us */
        const value = observable.get();
        // Which is why we only add the observable to the dependencies now.
        this._dependencies.add(observable);
        this._dependenciesToBeRemoved.delete(observable);
        return value;
    }
    addObserver(observer) {
        const shouldCallBeginUpdate = !this._observers.has(observer) && this._updateCount > 0;
        super.addObserver(observer);
        if (shouldCallBeginUpdate) {
            if (this._removedObserverToCallEndUpdateOn && this._removedObserverToCallEndUpdateOn.has(observer)) {
                this._removedObserverToCallEndUpdateOn.delete(observer);
            }
            else {
                observer.beginUpdate(this);
            }
        }
    }
    removeObserver(observer) {
        if (this._observers.has(observer) && this._updateCount > 0) {
            if (!this._removedObserverToCallEndUpdateOn) {
                this._removedObserverToCallEndUpdateOn = new Set();
            }
            this._removedObserverToCallEndUpdateOn.add(observer);
        }
        super.removeObserver(observer);
    }
    debugGetState() {
        return {
            state: this._state,
            updateCount: this._updateCount,
            isComputing: this._isComputing,
            dependencies: this._dependencies,
            value: this._value,
        };
    }
    debugSetValue(newValue) {
        this._value = newValue;
    }
}
export class DerivedWithSetter extends Derived {
    constructor(debugNameData, computeFn, createChangeSummary, handleChange, handleLastObserverRemoved = undefined, equalityComparator, set) {
        super(debugNameData, computeFn, createChangeSummary, handleChange, handleLastObserverRemoved, equalityComparator);
        this.set = set;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVyaXZlZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9vYnNlcnZhYmxlSW50ZXJuYWwvZGVyaXZlZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUE2RyxlQUFlLEdBQUcsTUFBTSxXQUFXLENBQUM7QUFDeEssT0FBTyxFQUFFLGFBQWEsRUFBOEIsTUFBTSxnQkFBZ0IsQ0FBQztBQUMzRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsZUFBZSxFQUFpQyxRQUFRLEVBQUUsb0JBQW9CLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDMUosT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBVWpELE1BQU0sVUFBVSxPQUFPLENBQUksZ0JBQXVELEVBQUUsU0FBZ0Q7SUFDbkksSUFBSSxTQUFTLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDN0IsT0FBTyxJQUFJLE9BQU8sQ0FDakIsSUFBSSxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUN6RCxTQUFTLEVBQ1QsU0FBUyxFQUNULFNBQVMsRUFDVCxTQUFTLEVBQ1QsWUFBWSxDQUNaLENBQUM7SUFDSCxDQUFDO0lBQ0QsT0FBTyxJQUFJLE9BQU8sQ0FDakIsSUFBSSxhQUFhLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxnQkFBdUIsQ0FBQyxFQUNoRSxnQkFBdUIsRUFDdkIsU0FBUyxFQUNULFNBQVMsRUFDVCxTQUFTLEVBQ1QsWUFBWSxDQUNaLENBQUM7QUFDSCxDQUFDO0FBRUQsTUFBTSxVQUFVLGlCQUFpQixDQUFJLEtBQTZCLEVBQUUsU0FBaUMsRUFBRSxNQUFpRTtJQUN2SyxPQUFPLElBQUksaUJBQWlCLENBQzNCLElBQUksYUFB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