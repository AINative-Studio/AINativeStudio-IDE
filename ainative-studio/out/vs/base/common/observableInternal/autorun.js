/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DebugNameData } from './debugName.js';
import { assertFn, BugIndicatingError, DisposableStore, markAsDisposed, onBugIndicatingError, toDisposable, trackDisposable } from './commonFacade/deps.js';
import { getLogger } from './logging/logging.js';
/**
 * Runs immediately and whenever a transaction ends and an observed observable changed.
 * {@link fn} should start with a JS Doc using `@description` to name the autorun.
 */
export function autorun(fn) {
    return new AutorunObserver(new DebugNameData(undefined, undefined, fn), fn, undefined, undefined);
}
/**
 * Runs immediately and whenever a transaction ends and an observed observable changed.
 * {@link fn} should start with a JS Doc using `@description` to name the autorun.
 */
export function autorunOpts(options, fn) {
    return new AutorunObserver(new DebugNameData(options.owner, options.debugName, options.debugReferenceFn ?? fn), fn, undefined, undefined);
}
/**
 * Runs immediately and whenever a transaction ends and an observed observable changed.
 * {@link fn} should start with a JS Doc using `@description` to name the autorun.
 *
 * Use `createEmptyChangeSummary` to create a "change summary" that can collect the changes.
 * Use `handleChange` to add a reported change to the change summary.
 * The run function is given the last change summary.
 * The change summary is discarded after the run function was called.
 *
 * @see autorun
 */
export function autorunHandleChanges(options, fn) {
    return new AutorunObserver(new DebugNameData(options.owner, options.debugName, options.debugReferenceFn ?? fn), fn, options.createEmptyChangeSummary, options.handleChange);
}
/**
 * @see autorunHandleChanges (but with a disposable store that is cleared before the next run or on dispose)
 */
export function autorunWithStoreHandleChanges(options, fn) {
    const store = new DisposableStore();
    const disposable = autorunHandleChanges({
        owner: options.owner,
        debugName: options.debugName,
        debugReferenceFn: options.debugReferenceFn ?? fn,
        createEmptyChangeSummary: options.createEmptyChangeSummary,
        handleChange: options.handleChange,
    }, (reader, changeSummary) => {
        store.clear();
        fn(reader, changeSummary, store);
    });
    return toDisposable(() => {
        disposable.dispose();
        store.dispose();
    });
}
/**
 * @see autorun (but with a disposable store that is cleared before the next run or on dispose)
 */
export function autorunWithStore(fn) {
    const store = new DisposableStore();
    const disposable = autorunOpts({
        owner: undefined,
        debugName: undefined,
        debugReferenceFn: fn,
    }, reader => {
        store.clear();
        fn(reader, store);
    });
    return toDisposable(() => {
        disposable.dispose();
        store.dispose();
    });
}
export function autorunDelta(observable, handler) {
    let _lastValue;
    return autorunOpts({ debugReferenceFn: handler }, (reader) => {
        const newValue = observable.read(reader);
        const lastValue = _lastValue;
        _lastValue = newValue;
        handler({ lastValue, newValue });
    });
}
export function autorunIterableDelta(getValue, handler, getUniqueIdentifier = v => v) {
    const lastValues = new Map();
    return autorunOpts({ debugReferenceFn: getValue }, (reader) => {
        const newValues = new Map();
        const removedValues = new Map(lastValues);
        for (const value of getValue(reader)) {
            const id = getUniqueIdentifier(value);
            if (lastValues.has(id)) {
                removedValues.delete(id);
            }
            else {
                newValues.set(id, value);
                lastValues.set(id, value);
            }
        }
        for (const id of removedValues.keys()) {
            lastValues.delete(id);
        }
        if (newValues.size || removedValues.size) {
            handler({ addedValues: [...newValues.values()], removedValues: [...removedValues.values()] });
        }
    });
}
export var AutorunState;
(function (AutorunState) {
    /**
     * A dependency could have changed.
     * We need to explicitly ask them if at least one dependency changed.
     */
    AutorunState[AutorunState["dependenciesMightHaveChanged"] = 1] = "dependenciesMightHaveChanged";
    /**
     * A dependency changed and we need to recompute.
     */
    AutorunState[AutorunState["stale"] = 2] = "stale";
    AutorunState[AutorunState["upToDate"] = 3] = "upToDate";
})(AutorunState || (AutorunState = {}));
export class AutorunObserver {
    get debugName() {
        return this._debugNameData.getDebugName(this) ?? '(anonymous)';
    }
    constructor(_debugNameData, _runFn, createChangeSummary, _handleChange) {
        this._debugNameData = _debugNameData;
        this._runFn = _runFn;
        this.createChangeSummary = createChangeSummary;
        this._handleChange = _handleChange;
        this._state = 2 /* AutorunState.stale */;
        this._updateCount = 0;
        this._disposed = false;
        this._dependencies = new Set();
        this._dependenciesToBeRemoved = new Set();
        this._isRunning = false;
        this._changeSummary = this.createChangeSummary?.();
        getLogger()?.handleAutorunCreated(this);
        this._run();
        trackDisposable(this);
    }
    dispose() {
        this._disposed = true;
        for (const o of this._dependencies) {
            o.removeObserver(this); // Warning: external call!
        }
        this._dependencies.clear();
        getLogger()?.handleAutorunDisposed(this);
        markAsDisposed(this);
    }
    _run() {
        const emptySet = this._dependenciesToBeRemoved;
        this._dependenciesToBeRemoved = this._dependencies;
        this._dependencies = emptySet;
        this._state = 3 /* AutorunState.upToDate */;
        try {
            if (!this._disposed) {
                getLogger()?.handleAutorunStarted(this);
                const changeSummary = this._changeSummary;
                try {
                    this._changeSummary = this.createChangeSummary?.(); // Warning: external call!
                    this._isRunning = true;
                    this._runFn(this, changeSummary); // Warning: external call!
                }
                catch (e) {
                    onBugIndicatingError(e);
                }
                finally {
                    this._isRunning = false;
                }
            }
        }
        finally {
            if (!this._disposed) {
                getLogger()?.handleAutorunFinished(this);
            }
            // We don't want our observed observables to think that they are (not even temporarily) not being observed.
            // Thus, we only unsubscribe from observables that are definitely not read anymore.
            for (const o of this._dependenciesToBeRemoved) {
                o.removeObserver(this); // Warning: external call!
            }
            this._dependenciesToBeRemoved.clear();
        }
    }
    toString() {
        return `Autorun<${this.debugName}>`;
    }
    // IObserver implementation
    beginUpdate(_observable) {
        if (this._state === 3 /* AutorunState.upToDate */) {
            this._state = 1 /* AutorunState.dependenciesMightHaveChanged */;
        }
        this._updateCount++;
    }
    endUpdate(_observable) {
        try {
            if (this._updateCount === 1) {
                do {
                    if (this._state === 1 /* AutorunState.dependenciesMightHaveChanged */) {
                        this._state = 3 /* AutorunState.upToDate */;
                        for (const d of this._dependencies) {
                            d.reportChanges(); // Warning: external call!
                            if (this._state === 2 /* AutorunState.stale */) {
                                // The other dependencies will refresh on demand
                                break;
                            }
                        }
                    }
                    if (this._state !== 3 /* AutorunState.upToDate */) {
                        this._run(); // Warning: indirect external call!
                    }
                } while (this._state !== 3 /* AutorunState.upToDate */);
            }
        }
        finally {
            this._updateCount--;
        }
        assertFn(() => this._updateCount >= 0);
    }
    handlePossibleChange(observable) {
        if (this._state === 3 /* AutorunState.upToDate */ && this._isDependency(observable)) {
            this._state = 1 /* AutorunState.dependenciesMightHaveChanged */;
        }
    }
    handleChange(observable, change) {
        if (this._isDependency(observable)) {
            getLogger()?.handleAutorunDependencyChanged(this, observable, change);
            try {
                // Warning: external call!
                const shouldReact = this._handleChange ? this._handleChange({
                    changedObservable: observable,
                    change,
                    didChange: (o) => o === observable,
                }, this._changeSummary) : true;
                if (shouldReact) {
                    this._state = 2 /* AutorunState.stale */;
                }
            }
            catch (e) {
                onBugIndicatingError(e);
            }
        }
    }
    _isDependency(observable) {
        return this._dependencies.has(observable) && !this._dependenciesToBeRemoved.has(observable);
    }
    // IReader implementation
    readObservable(observable) {
        if (!this._isRunning) {
            throw new BugIndicatingError('The reader object cannot be used outside its compute function!');
        }
        // In case the run action disposes the autorun
        if (this._disposed) {
            return observable.get(); // warning: external call!
        }
        observable.addObserver(this); // warning: external call!
        const value = observable.get(); // warning: external call!
        this._dependencies.add(observable);
        this._dependenciesToBeRemoved.delete(observable);
        return value;
    }
    debugGetState() {
        return {
            isRunning: this._isRunning,
            updateCount: this._updateCount,
            dependencies: this._dependencies,
            state: this._state,
        };
    }
    debugRerun() {
        if (!this._isRunning) {
            this._run();
        }
        else {
            this._state = 2 /* AutorunState.stale */;
        }
    }
}
(function (autorun) {
    autorun.Observer = AutorunObserver;
})(autorun || (autorun = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b3J1bi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9vYnNlcnZhYmxlSW50ZXJuYWwvYXV0b3J1bi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsYUFBYSxFQUFrQixNQUFNLGdCQUFnQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsa0JBQWtCLEVBQUUsZUFBZSxFQUFlLGNBQWMsRUFBRSxvQkFBb0IsRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDekssT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBRWpEOzs7R0FHRztBQUNILE1BQU0sVUFBVSxPQUFPLENBQUMsRUFBNkI7SUFDcEQsT0FBTyxJQUFJLGVBQWUsQ0FDekIsSUFBSSxhQUFhLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxFQUFFLENBQUMsRUFDM0MsRUFBRSxFQUNGLFNBQVMsRUFDVCxTQUFTLENBQ1QsQ0FBQztBQUNILENBQUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsV0FBVyxDQUFDLE9BQTRCLEVBQUUsRUFBNkI7SUFDdEYsT0FBTyxJQUFJLGVBQWUsQ0FDekIsSUFBSSxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsSUFBSSxFQUFFLENBQUMsRUFDbkYsRUFBRSxFQUNGLFNBQVMsRUFDVCxTQUFTLENBQ1QsQ0FBQztBQUNILENBQUM7QUFFRDs7Ozs7Ozs7OztHQVVHO0FBQ0gsTUFBTSxVQUFVLG9CQUFvQixDQUNuQyxPQUdDLEVBQ0QsRUFBNEQ7SUFFNUQsT0FBTyxJQUFJLGVBQWUsQ0FDekIsSUFBSSxhQUFhLENBQUMsT0FBTyxD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