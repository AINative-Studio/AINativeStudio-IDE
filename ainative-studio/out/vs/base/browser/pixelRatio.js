/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getWindowId, onDidUnregisterWindow } from './dom.js';
import { Emitter, Event } from '../common/event.js';
import { Disposable, markAsSingleton } from '../common/lifecycle.js';
/**
 * See https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio#monitoring_screen_resolution_or_zoom_level_changes
 */
class DevicePixelRatioMonitor extends Disposable {
    constructor(targetWindow) {
        super();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._listener = () => this._handleChange(targetWindow, true);
        this._mediaQueryList = null;
        this._handleChange(targetWindow, false);
    }
    _handleChange(targetWindow, fireEvent) {
        this._mediaQueryList?.removeEventListener('change', this._listener);
        this._mediaQueryList = targetWindow.matchMedia(`(resolution: ${targetWindow.devicePixelRatio}dppx)`);
        this._mediaQueryList.addEventListener('change', this._listener);
        if (fireEvent) {
            this._onDidChange.fire();
        }
    }
}
class PixelRatioMonitorImpl extends Disposable {
    get value() {
        return this._value;
    }
    constructor(targetWindow) {
        super();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._value = this._getPixelRatio(targetWindow);
        const dprMonitor = this._register(new DevicePixelRatioMonitor(targetWindow));
        this._register(dprMonitor.onDidChange(() => {
            this._value = this._getPixelRatio(targetWindow);
            this._onDidChange.fire(this._value);
        }));
    }
    _getPixelRatio(targetWindow) {
        const ctx = document.createElement('canvas').getContext('2d');
        const dpr = targetWindow.devicePixelRatio || 1;
        const bsr = ctx.webkitBackingStorePixelRatio ||
            ctx.mozBackingStorePixelRatio ||
            ctx.msBackingStorePixelRatio ||
            ctx.oBackingStorePixelRatio ||
            ctx.backingStorePixelRatio || 1;
        return dpr / bsr;
    }
}
class PixelRatioMonitorFacade {
    constructor() {
        this.mapWindowIdToPixelRatioMonitor = new Map();
    }
    _getOrCreatePixelRatioMonitor(targetWindow) {
        const targetWindowId = getWindowId(targetWindow);
        let pixelRatioMonitor = this.mapWindowIdToPixelRatioMonitor.get(targetWindowId);
        if (!pixelRatioMonitor) {
            pixelRatioMonitor = markAsSingleton(new PixelRatioMonitorImpl(targetWindow));
            this.mapWindowIdToPixelRatioMonitor.set(targetWindowId, pixelRatioMonitor);
            markAsSingleton(Event.once(onDidUnregisterWindow)(({ vscodeWindowId }) => {
                if (vscodeWindowId === targetWindowId) {
                    pixelRatioMonitor?.dispose();
                    this.mapWindowIdToPixelRatioMonitor.delete(targetWindowId);
                }
            }));
        }
        return pixelRatioMonitor;
    }
    getInstance(targetWindow) {
        return this._getOrCreatePixelRatioMonitor(targetWindow);
    }
}
/**
 * Returns the pixel ratio.
 *
 * This is useful for rendering <canvas> elements at native screen resolution or for being used as
 * a cache key when storing font measurements. Fonts might render differently depending on resolution
 * and any measurements need to be discarded for example when a window is moved from a monitor to another.
 */
export const PixelRatio = new PixelRatioMonitorFacade();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGl4ZWxSYXRpby5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci9waXhlbFJhdGlvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNwRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBRXJFOztHQUVHO0FBQ0gsTUFBTSx1QkFBd0IsU0FBUSxVQUFVO0lBUS9DLFlBQVksWUFBb0I7UUFDL0IsS0FBSyxFQUFFLENBQUM7UUFQUSxpQkFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQzNELGdCQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUM7UUFROUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5RCxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQztRQUM1QixJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBRU8sYUFBYSxDQUFDLFlBQW9CLEVBQUUsU0FBa0I7UUFDN0QsSUFBSSxDQUFDLGVBQWUsRUFBRSxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRXBFLElBQUksQ0FBQyxlQUFlLEdBQUcsWUFBWSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsWUFBWSxDQUFDLGdCQUFnQixP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