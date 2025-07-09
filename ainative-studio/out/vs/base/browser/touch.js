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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG91Y2guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3RvdWNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxRQUFRLE1BQU0sVUFBVSxDQUFDO0FBQ3JDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDekMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxLQUFLLElBQUksVUFBVSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBZSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRXJELE1BQU0sS0FBVyxTQUFTLENBTXpCO0FBTkQsV0FBaUIsU0FBUztJQUNaLGFBQUcsR0FBRyxvQkFBb0IsQ0FBQztJQUMzQixnQkFBTSxHQUFHLHVCQUF1QixDQUFDO0lBQ2pDLGVBQUssR0FBRyxzQkFBc0IsQ0FBQztJQUMvQixhQUFHLEdBQUcscUJBQXFCLENBQUM7SUFDNUIscUJBQVcsR0FBRyw0QkFBNEIsQ0FBQztBQUN6RCxDQUFDLEVBTmdCLFNBQVMsS0FBVCxTQUFTLFFBTXpCO0FBa0RELE1BQU0sT0FBTyxPQUFRLFNBQVEsVUFBVTthQUVkLG9CQUFlLEdBQUcsQ0FBQyxLQUFLLEFBQVQsQ0FBVTthQUV6QixlQUFVLEdBQUcsR0FBRyxBQUFOLENBQU87YUFXakIseUJBQW9CLEdBQUcsR0FBRyxBQUFOLENBQU8sR0FBQyxLQUFLO0lBR3pEO1FBQ0MsS0FBSyxFQUFFLENBQUM7UUFiRCxlQUFVLEdBQUcsS0FBSyxDQUFDO1FBQ1YsWUFBTyxHQUFH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