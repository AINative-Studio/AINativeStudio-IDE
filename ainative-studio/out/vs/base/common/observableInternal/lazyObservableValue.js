/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseObservable, TransactionImpl } from './base.js';
import { getLogger } from './logging/logging.js';
/**
 * Holds off updating observers until the value is actually read.
*/
export class LazyObservableValue extends BaseObservable {
    get debugName() {
        return this._debugNameData.getDebugName(this) ?? 'LazyObservableValue';
    }
    constructor(_debugNameData, initialValue, _equalityComparator) {
        super();
        this._debugNameData = _debugNameData;
        this._equalityComparator = _equalityComparator;
        this._isUpToDate = true;
        this._deltas = [];
        this._updateCounter = 0;
        this._value = initialValue;
    }
    get() {
        this._update();
        return this._value;
    }
    _update() {
        if (this._isUpToDate) {
            return;
        }
        this._isUpToDate = true;
        if (this._deltas.length > 0) {
            for (const change of this._deltas) {
                getLogger()?.handleObservableUpdated(this, { change, didChange: true, oldValue: '(unknown)', newValue: this._value, hadValue: true });
                for (const observer of this._observers) {
                    observer.handleChange(this, change);
                }
            }
            this._deltas.length = 0;
        }
        else {
            getLogger()?.handleObservableUpdated(this, { change: undefined, didChange: true, oldValue: '(unknown)', newValue: this._value, hadValue: true });
            for (const observer of this._observers) {
                observer.handleChange(this, undefined);
            }
        }
    }
    _beginUpdate() {
        this._updateCounter++;
        if (this._updateCounter === 1) {
            for (const observer of this._observers) {
                observer.beginUpdate(this);
            }
        }
    }
    _endUpdate() {
        this._updateCounter--;
        if (this._updateCounter === 0) {
            this._update();
            // End update could change the observer list.
            const observers = [...this._observers];
            for (const r of observers) {
                r.endUpdate(this);
            }
        }
    }
    addObserver(observer) {
        const shouldCallBeginUpdate = !this._observers.has(observer) && this._updateCounter > 0;
        super.addObserver(observer);
        if (shouldCallBeginUpdate) {
            observer.beginUpdate(this);
        }
    }
    removeObserver(observer) {
        const shouldCallEndUpdate = this._observers.has(observer) && this._updateCounter > 0;
        super.removeObserver(observer);
        if (shouldCallEndUpdate) {
            // Calling end update after removing the observer makes sure endUpdate cannot be called twice here.
            observer.endUpdate(this);
        }
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
            this._isUpToDate = false;
            this._setValue(value);
            if (change !== undefined) {
                this._deltas.push(change);
            }
            tx.updateObserver({
                beginUpdate: () => this._beginUpdate(),
                endUpdate: () => this._endUpdate(),
                handleChange: (observable, change) => { },
                handlePossibleChange: (observable) => { },
            }, this);
            if (this._updateCounter > 1) {
                // We already started begin/end update, so we need to manually call handlePossibleChange
                for (const observer of this._observers) {
                    observer.handlePossibleChange(this);
                }
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
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF6eU9ic2VydmFibGVWYWx1ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9vYnNlcnZhYmxlSW50ZXJuYWwvbGF6eU9ic2VydmFibGVWYWx1ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsY0FBYyxFQUFnRCxlQUFlLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFFMUcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBRWpEOztFQUVFO0FBQ0YsTUFBTSxPQUFPLG1CQUNaLFNBQVEsY0FBMEI7SUFNbEMsSUFBSSxTQUFTO1FBQ1osT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxxQkFBcUIsQ0FBQztJQUN4RSxDQUFDO0lBRUQsWUFDa0IsY0FBNkIsRUFDOUMsWUFBZSxFQUNFLG1CQUF3QztRQUV6RCxLQUFLLEVBQUUsQ0FBQztRQUpTLG1CQUFjLEdBQWQsY0FBYyxDQUFlO1FBRTdCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBcUI7UUFWbEQsZ0JBQVcsR0FBRyxJQUFJLENBQUM7UUFDVixZQUFPLEdBQWMsRUFBRSxDQUFDO1FBMENqQyxtQkFBYyxHQUFHLENBQUMsQ0FBQztRQTlCMUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxZQUFZLENBQUM7SUFDNUIsQ0FBQztJQUVlLEdBQUc7UUFDbEIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2YsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3BCLENBQUM7SUFFTyxPQUFPO1FBQ2QsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdEIsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztRQUV4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