/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
function createDecorator(mapFn) {
    return (_target, key, descriptor) => {
        let fnKey = null;
        let fn = null;
        if (typeof descriptor.value === 'function') {
            fnKey = 'value';
            fn = descriptor.value;
        }
        else if (typeof descriptor.get === 'function') {
            fnKey = 'get';
            fn = descriptor.get;
        }
        if (!fn || typeof key === 'symbol') {
            throw new Error('not supported');
        }
        descriptor[fnKey] = mapFn(fn, key);
    };
}
export function memoize(_target, key, descriptor) {
    let fnKey = null;
    let fn = null;
    if (typeof descriptor.value === 'function') {
        fnKey = 'value';
        fn = descriptor.value;
        if (fn.length !== 0) {
            console.warn('Memoize should only be used in functions with zero parameters');
        }
    }
    else if (typeof descriptor.get === 'function') {
        fnKey = 'get';
        fn = descriptor.get;
    }
    if (!fn) {
        throw new Error('not supported');
    }
    const memoizeKey = `$memoize$${key}`;
    descriptor[fnKey] = function (...args) {
        if (!this.hasOwnProperty(memoizeKey)) {
            Object.defineProperty(this, memoizeKey, {
                configurable: false,
                enumerable: false,
                writable: false,
                value: fn.apply(this, args)
            });
        }
        return this[memoizeKey];
    };
}
export function debounce(delay, reducer, initialValueProvider) {
    return createDecorator((fn, key) => {
        const timerKey = `$debounce$${key}`;
        const resultKey = `$debounce$result$${key}`;
        return function (...args) {
            if (!this[resultKey]) {
                this[resultKey] = initialValueProvider ? initialValueProvider() : undefined;
            }
            clearTimeout(this[timerKey]);
            if (reducer) {
                this[resultKey] = reducer(this[resultKey], ...args);
                args = [this[resultKey]];
            }
            this[timerKey] = setTimeout(() => {
                fn.apply(this, args);
                this[resultKey] = initialValueProvider ? initialValueProvider() : undefined;
            }, delay);
        };
    });
}
export function throttle(delay, reducer, initialValueProvider) {
    return createDecorator((fn, key) => {
        const timerKey = `$throttle$timer$${key}`;
        const resultKey = `$throttle$result$${key}`;
        const lastRunKey = `$throttle$lastRun$${key}`;
        const pendingKey = `$throttle$pending$${key}`;
        return function (...args) {
            if (!this[resultKey]) {
                this[resultKey] = initialValueProvider ? initialValueProvider() : undefined;
            }
            if (this[lastRunKey] === null || this[lastRunKey] === undefined) {
                this[lastRunKey] = -Number.MAX_VALUE;
            }
            if (reducer) {
                this[resultKey] = reducer(this[resultKey], ...args);
            }
            if (this[pendingKey]) {
                return;
            }
            const nextTime = this[lastRunKey] + delay;
            if (nextTime <= Date.now()) {
                this[lastRunKey] = Date.now();
                fn.apply(this, [this[resultKey]]);
                this[resultKey] = initialValueProvider ? initialValueProvider() : undefined;
            }
            else {
                this[pendingKey] = true;
                this[timerKey] = setTimeout(() => {
                    this[pendingKey] = false;
                    this[lastRunKey] = Date.now();
                    fn.apply(this, [this[resultKey]]);
                    this[resultKey] = initialValueProvider ? initialValueProvider() : undefined;
                }, nextTime - Date.now());
            }
        };
    });
}
export { cancelPreviousCalls } from './decorators/cancelPreviousCalls.js';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9kZWNvcmF0b3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLFNBQVMsZUFBZSxDQUFDLEtBQThDO0lBQ3RFLE9BQU8sQ0FBQyxPQUFlLEVBQUUsR0FBb0IsRUFBRSxVQUF3QyxFQUFFLEVBQUU7UUFDMUYsSUFBSSxLQUFLLEdBQTJCLElBQUksQ0FBQztRQUN6QyxJQUFJLEVBQUUsR0FBb0IsSUFBSSxDQUFDO1FBRS9CLElBQUksT0FBTyxVQUFVLENBQUMsS0FBSyxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQzVDLEtBQUssR0FBRyxPQUFPLENBQUM7WUFDaEIsRUFBRSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUM7UUFDdkIsQ0FBQzthQUFNLElBQUksT0FBTyxVQUFVLENBQUMsR0FBRyxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQ2pELEtBQUssR0FBRyxLQUFLLENBQUM7WUFDZCxFQUFFLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQztRQUNyQixDQUFDO1FBRUQsSUFBSSxDQUFDLEVBQUUsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNwQyxNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ2xDLENBQUM7UUFFRCxVQUFVLENBQUMsS0FBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNyQyxDQUFDLENBQUM7QUFDSCxDQUFDO0FBRUQsTUFBTSxVQUFVLE9BQU8sQ0FBQyxPQUFlLEVBQUUsR0FBVyxFQUFFLFVBQThCO0lBQ25GLElBQUksS0FBSyxHQUEyQixJQUFJLENBQUM7SUFDekMsSUFBSSxFQUFFLEdBQW9CLElBQUksQ0FBQztJ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