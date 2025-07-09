/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getActiveWindow } from '../../../../../base/browser/dom.js';
import { observableValue, observableSignal } from '../../../../../base/common/observable.js';
export class AnimatedValue {
    static const(value) {
        return new AnimatedValue(value, value, 0);
    }
    constructor(startValue, endValue, durationMs, _interpolationFunction = easeOutExpo) {
        this.startValue = startValue;
        this.endValue = endValue;
        this.durationMs = durationMs;
        this._interpolationFunction = _interpolationFunction;
        this.startTimeMs = Date.now();
        if (startValue === endValue) {
            this.durationMs = 0;
        }
    }
    isFinished() {
        return Date.now() >= this.startTimeMs + this.durationMs;
    }
    getValue() {
        const timePassed = Date.now() - this.startTimeMs;
        if (timePassed >= this.durationMs) {
            return this.endValue;
        }
        const value = this._interpolationFunction(timePassed, this.startValue, this.endValue - this.startValue, this.durationMs);
        return value;
    }
}
export function easeOutExpo(passedTime, start, length, totalDuration) {
    return passedTime === totalDuration
        ? start + length
        : length * (-Math.pow(2, -10 * passedTime / totalDuration) + 1) + start;
}
export function easeOutCubic(passedTime, start, length, totalDuration) {
    return length * ((passedTime = passedTime / totalDuration - 1) * passedTime * passedTime + 1) + start;
}
export function linear(passedTime, start, length, totalDuration) {
    return length * passedTime / totalDuration + start;
}
export class ObservableAnimatedValue {
    static const(value) {
        return new ObservableAnimatedValue(AnimatedValue.const(value));
    }
    constructor(initialValue) {
        this._value = observableValue(this, initialValue);
    }
    setAnimation(value, tx) {
        this._value.set(value, tx);
    }
    changeAnimation(fn, tx) {
        const value = fn(this._value.get());
        this._value.set(value, tx);
    }
    getValue(reader) {
        const value = this._value.read(reader);
        if (!value.isFinished()) {
            Scheduler.instance.invalidateOnNextAnimationFrame(reader);
        }
        return value.getValue();
    }
}
class Scheduler {
    constructor() {
        this._counter = observableSignal(this);
        this._isScheduled = false;
    }
    static { this.instance = new Scheduler(); }
    invalidateOnNextAnimationFrame(reader) {
        this._counter.read(reader);
        if (!this._isScheduled) {
            this._isScheduled = true;
            getActiveWindow().requestAnimationFrame(() => {
                this._isScheduled = false;
                this._update();
            });
        }
    }
    _update() {
        this._counter.trigger(undefined);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5pbWF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvbW9kZWwvYW5pbWF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNyRSxPQUFPLEVBQXVCLGVBQWUsRUFBeUIsZ0JBQWdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUV6SSxNQUFNLE9BQU8sYUFBYTtJQUNsQixNQUFNLENBQUMsS0FBSyxDQUFDLEtBQWE7UUFDaEMsT0FBTyxJQUFJLGFBQWEsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFJRCxZQUNpQixVQUFrQixFQUNsQixRQUFnQixFQUNoQixVQUFrQixFQUNqQix5QkFBZ0QsV0FBVztRQUg1RCxlQUFVLEdBQVYsVUFBVSxDQUFRO1FBQ2xCLGFBQVEsR0FBUixRQUFRLENBQVE7UUFDaEIsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQUNqQiwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXFDO1FBTjdELGdCQUFXLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBUXhDLElBQUksVUFBVSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDO1FBQ3JCLENBQUM7SUFDRixDQUFDO0lBRUQsVUFBVTtRQUNULE9BQU8sSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztJQUN6RCxDQUFDO0lBRUQsUUFBUTtRQUNQLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLEVB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