/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { observableValue, transaction } from './base.js';
import { derived } from './derived.js';
export class ObservableLazy {
    /**
     * The cached value.
     * Does not force a computation of the value.
     */
    get cachedValue() { return this._value; }
    constructor(_computeValue) {
        this._computeValue = _computeValue;
        this._value = observableValue(this, undefined);
    }
    /**
     * Returns the cached value.
     * Computes the value if the value has not been cached yet.
     */
    getValue() {
        let v = this._value.get();
        if (!v) {
            v = this._computeValue();
            this._value.set(v, undefined);
        }
        return v;
    }
}
/**
 * A promise whose state is observable.
 */
export class ObservablePromise {
    static fromFn(fn) {
        return new ObservablePromise(fn());
    }
    constructor(promise) {
        this._value = observableValue(this, undefined);
        /**
         * The current state of the promise.
         * Is `undefined` if the promise didn't resolve yet.
         */
        this.promiseResult = this._value;
        this.promise = promise.then(value => {
            transaction(tx => {
                /** @description onPromiseResolved */
                this._value.set(new PromiseResult(value, undefined), tx);
            });
            return value;
        }, error => {
            transaction(tx => {
                /** @description onPromiseRejected */
                this._value.set(new PromiseResult(undefined, error), tx);
            });
            throw error;
        });
    }
}
export class PromiseResult {
    constructor(
    /**
     * The value of the resolved promise.
     * Undefined if the promise rejected.
     */
    data, 
    /**
     * The error in case of a rejected promise.
     * Undefined if the promise resolved.
     */
    error) {
        this.data = data;
        this.error = error;
    }
    /**
     * Returns the value if the promise resolved, otherwise throws the error.
     */
    getDataOrThrow() {
        if (this.error) {
            throw this.error;
        }
        return this.data;
    }
}
/**
 * A lazy promise whose state is observable.
 */
export class ObservableLazyPromise {
    constructor(_computePromise) {
        this._computePromise = _computePromise;
        this._lazyValue = new ObservableLazy(() => new ObservablePromise(this._computePromise()));
        /**
         * Does not enforce evaluation of the promise compute function.
         * Is undefined if the promise has not been computed yet.
         */
        this.cachedPromiseResult = derived(this, reader => this._lazyValue.cachedValue.read(reader)?.promiseResult.read(reader));
    }
    getPromise() {
        return this._lazyValue.getValue().promise;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbWlzZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9vYnNlcnZhYmxlSW50ZXJuYWwvcHJvbWlzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQWUsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBRXZDLE1BQU0sT0FBTyxjQUFjO0lBRzFCOzs7T0FHRztJQUNILElBQVcsV0FBVyxLQUFpQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBRTVFLFlBQTZCLGFBQXNCO1FBQXRCLGtCQUFhLEdBQWIsYUFBYSxDQUFTO1FBUmxDLFdBQU0sR0FBRyxlQUFlLENBQWdCLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztJQVMxRSxDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksUUFBUTtRQUNkLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDMUIsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ1IsQ0FBQyxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDL0IsQ0FBQztRQUNELE9BQU8sQ0FBQyxDQUFDO0lBQ1YsQ0FBQztDQUNEO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8saUJBQWlCO0lBQ3RCLE1BQU0sQ0FBQyxNQUFNLENBQUksRUFBb0I7UUFDM0MsT0FBTyxJQUFJLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQWVELFlBQVksT0FBbUI7UUFiZCxXQUFNLEdBQUcsZUFBZSxDQUErQixJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFPekY7OztXQUdHO1FBQ2Esa0JBQWEsR0FBOEMsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUd0RixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDbkMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxFQUFFO2dCQUNoQixxQ0FBcUM7Z0JBQ3JDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksYUFBYSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUMxRCxDQUFDLENBQUMsQ0FBQztZQUNILE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFO1lBQ1YsV0FBVyxDQUFDLEVBQUUsQ0FBQyxFQUFFO2dCQUNoQixxQ0FBcUM7Z0JBQ3JDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksYUFBYSxDQUFJLFNBQVMsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM3RCxDQUFDLENBQUMsQ0FBQztZQUNILE1BQU0sS0FBSyxDQUFDO1FBQ2IsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sYUFBYTtJQUN6QjtJQUNDOzs7T0FHRztJQUNhLElBQW1CO0lBRW5DOzs7T0FHRztJQUNhLEtBQTBCO1FBTjFCLFNBQUksR0FBSixJQUFJLENBQWU7UUFNbkIsVUFBSyxHQUFMLEtBQUssQ0FBcUI7SUFFM0MsQ0FBQztJQUVEOztPQUVHO0lBQ0ksY0FBYztRQUNwQixJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNoQixNQUFNLElBQUksQ0FBQyxLQUFLLENBQUM7UUFDbEIsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLElBQUssQ0FBQztJQUNuQixDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyxxQkFBcUI7SUFTakMsWUFBNkIsZUFBaUM7UUFBakMsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBUjdDLGVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFdEc7OztXQUdHO1FBQ2Esd0JBQW1CLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFHcEksQ0FBQztJQUVNLFVBQVU7UUFDaEIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQztJQUMzQyxDQUFDO0NBQ0QifQ==