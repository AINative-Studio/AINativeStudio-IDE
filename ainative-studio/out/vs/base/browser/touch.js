/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import * as DomUtils from './dom.js';
import { mainWindow } from './window.js';
import { memoize } from '../common/decorators.js';
import { Event as EventUtils } from '../common/event.js';
import { Disposable, markAsSingleton, toDisposable } from '../common/lifecycle.js';
import { LinkedList } from '../common/linkedList.js';
export var EventType;
(function (EventType) {
    EventType.Tap = '-monaco-gesturetap';
    EventType.Change = '-monaco-gesturechange';
    EventType.Start = '-monaco-gesturestart';
    EventType.End = '-monaco-gesturesend';
    EventType.Contextmenu = '-monaco-gesturecontextmenu';
})(EventType || (EventType = {}));
export class Gesture extends Disposable {
    static { this.SCROLL_FRICTION = -0.005; }
    static { this.HOLD_DELAY = 700; }
    static { this.CLEAR_TAP_COUNT_TIME = 400; } // ms
    constructor() {
        super();
        this.dispatched = false;
        this.targets = new LinkedList();
        this.ignoreTargets = new LinkedList();
        this.activeTouches = {};
        this.handle = null;
        this._lastSetTapCountTime = 0;
        this._register(EventUtils.runAndSubscribe(DomUtils.onDidRegisterWindow, ({ window, disposables }) => {
            disposables.add(DomUtils.addDisposableListener(window.document, 'touchstart', (e) => this.onTouchStart(e), { passive: false }));
            disposables.add(DomUtils.addDisposableListener(window.document, 'touchend', (e) => this.onTouchEnd(window, e)));
            disposables.add(DomUtils.addDisposableListener(window.document, 'touchmove', (e) => this.onTouchMove(e), { passive: false }));
        }, { window: mainWindow, disposables: this._store }));
    }
    static addTarget(element) {
        if (!Gesture.isTouchDevice()) {
            return Disposable.None;
        }
        if (!Gesture.INSTANCE) {
            Gesture.INSTANCE = markAsSingleton(new Gesture());
        }
        const remove = Gesture.INSTANCE.targets.push(element);
        return toDisposable(remove);
    }
    static ignoreTarget(element) {
        if (!Gesture.isTouchDevice()) {
            return Disposable.None;
        }
        if (!Gesture.INSTANCE) {
            Gesture.INSTANCE = markAsSingleton(new Gesture());
        }
        const remove = Gesture.INSTANCE.ignoreTargets.push(element);
        return toDisposable(remove);
    }
    static isTouchDevice() {
        // `'ontouchstart' in window` always evaluates to true with typescript's modern typings. This causes `window` to be
        // `never` later in `window.navigator`. That's why we need the explicit `window as Window` cast
        return 'ontouchstart' in mainWindow || navigator.maxTouchPoints > 0;
    }
    dispose() {
        if (this.handle) {
            this.handle.dispose();
            this.handle = null;
        }
        super.dispose();
    }
    onTouchStart(e) {
        const timestamp = Date.now(); // use Date.now() because on FF e.timeStamp is not epoch based.
        if (this.handle) {
            this.handle.dispose();
            this.handle = null;
        }
        for (let i = 0, len = e.targetTouches.length; i < len; i++) {
            const touch = e.targetTouches.item(i);
            this.activeTouches[touch.identifier] = {
                id: touch.identifier,
                initialTarget: touch.target,
                initialTimeStamp: timestamp,
                initialPageX: touch.pageX,
                initialPageY: touch.pageY,
                rollingTimestamps: [timestamp],
                rollingPageX: [touch.pageX],
                rollingPageY: [touch.pageY]
            };
            const evt = this.newGestureEvent(EventType.Start, touch.target);
            evt.pageX = touch.pageX;
            evt.pageY = touch.pageY;
            this.dispatchEvent(evt);
        }
        if (this.dispatched) {
            e.preventDefault();
            e.stopPropagation();
            this.dispatched = false;
        }
    }
    onTouchEnd(targetWindow, e) {
        const timestamp = Date.now(); // use Date.now() because on FF e.timeStamp is not epoch based.
        const activeTouchCount = Object.keys(this.activeTouches).length;
        for (let i = 0, len = e.changedTouches.length; i < len; i++) {
            const touch = e.changedTouches.item(i);
            if (!this.activeTouches.hasOwnProperty(String(touch.identifier))) {
                console.warn('move of an UNKNOWN touch', touch);
                continue;
            }
            const data = this.activeTouches[touch.identifier], holdTime = Date.now() - data.initialTimeStamp;
            if (holdTime < Gesture.HOLD_DELAY
                && Math.abs(data.initialPageX - data.rollingPageX.at(-1)) < 30
                && Math.abs(data.initialPageY - data.rollingPageY.at(-1)) < 30) {
                const evt = this.newGestureEvent(EventType.Tap, data.initialTarget);
                evt.pageX = data.rollingPageX.at(-1);
                evt.pageY = data.rollingPageY.at(-1);
                this.dispatchEvent(evt);
            }
            else if (holdTime >= Gesture.HOLD_DELAY
                && Math.abs(data.initialPageX - data.rollingPageX.at(-1)) < 30
                && Math.abs(data.initialPageY - data.rollingPageY.at(-1)) < 30) {
                const evt = this.newGestureEvent(EventType.Contextmenu, data.initialTarget);
                evt.pageX = data.rollingPageX.at(-1);
                evt.pageY = data.rollingPageY.at(-1);
                this.dispatchEvent(evt);
            }
            else if (activeTouchCount === 1) {
                const finalX = data.rollingPageX.at(-1);
                const finalY = data.rollingPageY.at(-1);
                const deltaT = data.rollingTimestamps.at(-1) - data.rollingTimestamps[0];
                const deltaX = finalX - data.rollingPageX[0];
                const deltaY = finalY - data.rollingPageY[0];
                // We need to get all the dispatch targets on the start of the inertia event
                const dispatchTo = [...this.targets].filter(t => data.initialTarget instanceof Node && t.contains(data.initialTarget));
                this.inertia(targetWindow, dispatchTo, timestamp, // time now
                Math.abs(deltaX) / deltaT, // speed
                deltaX > 0 ? 1 : -1, // x direction
                finalX, // x now
                Math.abs(deltaY) / deltaT, // y speed
                deltaY > 0 ? 1 : -1, // y direction
                finalY // y now
                );
            }
            this.dispatchEvent(this.newGestureEvent(EventType.End, data.initialTarget));
            // forget about this touch
            delete this.activeTouches[touch.identifier];
        }
        if (this.dispatched) {
            e.preventDefault();
            e.stopPropagation();
            this.dispatched = false;
        }
    }
    newGestureEvent(type, initialTarget) {
        const event = document.createEvent('CustomEvent');
        event.initEvent(type, false, true);
        event.initialTarget = initialTarget;
        event.tapCount = 0;
        return event;
    }
    dispatchEvent(event) {
        if (event.type === EventType.Tap) {
            const currentTime = (new Date()).getTime();
            let setTapCount = 0;
            if (currentTime - this._lastSetTapCountTime > Gesture.CLEAR_TAP_COUNT_TIME) {
                setTapCount = 1;
            }
            else {
                setTapCount = 2;
            }
            this._lastSetTapCountTime = currentTime;
            event.tapCount = setTapCount;
        }
        else if (event.type === EventType.Change || event.type === EventType.Contextmenu) {
            // tap is canceled by scrolling or context menu
            this._lastSetTapCountTime = 0;
        }
        if (event.initialTarget instanceof Node) {
            for (const ignoreTarget of this.ignoreTargets) {
                if (ignoreTarget.contains(event.initialTarget)) {
                    return;
                }
            }
            const targets = [];
            for (const target of this.targets) {
                if (target.contains(event.initialTarget)) {
                    let depth = 0;
                    let now = event.initialTarget;
                    while (now && now !== target) {
                        depth++;
                        now = now.parentElement;
                    }
                    targets.push([depth, target]);
                }
            }
            targets.sort((a, b) => a[0] - b[0]);
            for (const [_, target] of targets) {
                target.dispatchEvent(event);
                this.dispatched = true;
            }
        }
    }
    inertia(targetWindow, dispatchTo, t1, vX, dirX, x, vY, dirY, y) {
        this.handle = DomUtils.scheduleAtNextAnimationFrame(targetWindow, () => {
            const now = Date.now();
            // velocity: old speed + accel_over_time
            const deltaT = now - t1;
            let delta_pos_x = 0, delta_pos_y = 0;
            let stopped = true;
            vX += Gesture.SCROLL_FRICTION * deltaT;
            vY += Gesture.SCROLL_FRICTION * deltaT;
            if (vX > 0) {
                stopped = false;
                delta_pos_x = dirX * vX * deltaT;
            }
            if (vY > 0) {
                stopped = false;
                delta_pos_y = dirY * vY * deltaT;
            }
            // dispatch translation event
            const evt = this.newGestureEvent(EventType.Change);
            evt.translationX = delta_pos_x;
            evt.translationY = delta_pos_y;
            dispatchTo.forEach(d => d.dispatchEvent(evt));
            if (!stopped) {
                this.inertia(targetWindow, dispatchTo, now, vX, dirX, x + delta_pos_x, vY, dirY, y + delta_pos_y);
            }
        });
    }
    onTouchMove(e) {
        const timestamp = Date.now(); // use Date.now() because on FF e.timeStamp is not epoch based.
        for (let i = 0, len = e.changedTouches.length; i < len; i++) {
            const touch = e.changedTouches.item(i);
            if (!this.activeTouches.hasOwnProperty(String(touch.identifier))) {
                console.warn('end of an UNKNOWN touch', touch);
                continue;
            }
            const data = this.activeTouches[touch.identifier];
            const evt = this.newGestureEvent(EventType.Change, data.initialTarget);
            evt.translationX = touch.pageX - data.rollingPageX.at(-1);
            evt.translationY = touch.pageY - data.rollingPageY.at(-1);
            evt.pageX = touch.pageX;
            evt.pageY = touch.pageY;
            this.dispatchEvent(evt);
            // only keep a few data points, to average the final speed
            if (data.rollingPageX.length > 3) {
                data.rollingPageX.shift();
                data.rollingPageY.shift();
                data.rollingTimestamps.shift();
            }
            data.rollingPageX.push(touch.pageX);
            data.rollingPageY.push(touch.pageY);
            data.rollingTimestamps.push(timestamp);
        }
        if (this.dispatched) {
            e.preventDefault();
            e.stopPropagation();
            this.dispatched = false;
        }
    }
}
__decorate([
    memoize
], Gesture, "isTouchDevice", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG91Y2guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdG91Y2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLFFBQVEsTUFBTSxVQUFVLENBQUM7QUFDckMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUN6QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDbEQsT0FBTyxFQUFFLEtBQUssSUFBSSxVQUFVLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFlLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFckQsTUFBTSxLQUFXLFNBQVMsQ0FNekI7QUFORCxXQUFpQixTQUFTO0lBQ1osYUFBRyxHQUFHLG9CQUFvQixDQUFDO0lBQzNCLGdCQUFNLEdBQUcsdUJBQXVCLENBQUM7SUFDakMsZUFBSyxHQUFHLHNCQUFzQixDQUFDO0lBQy9CLGFBQUcsR0FBRyxxQkFBcUIsQ0FBQztJQUM1QixxQkFBVyxHQUFHLDRCQUE0QixDQUFDO0FBQ3pELENBQUMsRUFOZ0IsU0FBUyxLQUFULFNBQVMsUUFNekI7QUFrREQsTUFBTSxPQUFPLE9BQVEsU0FBUSxVQUFVO2FBRWQsb0JBQWUsR0FBRyxDQUFDLEtBQUssQUFBVCxDQUFVO2FBRXpCLGVBQVUsR0FBRyxHQUFHLEFBQU4sQ0FBTzthQVdqQix5QkFBb0IsR0FBRyxHQUFHLEFBQU4sQ0FBTyxHQUFDLEtBQUs7SUFHekQ7UUFDQyxLQUFLLEVBQUUsQ0FBQztRQWJELGVBQVUsR0FBRyxLQUFLLENBQUM7UUFDVixZQUFPLEdBQUcs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