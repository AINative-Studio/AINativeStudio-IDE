/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as browser from './browser.js';
import { IframeUtils } from './iframe.js';
import * as platform from '../common/platform.js';
export class StandardMouseEvent {
    constructor(targetWindow, e) {
        this.timestamp = Date.now();
        this.browserEvent = e;
        this.leftButton = e.button === 0;
        this.middleButton = e.button === 1;
        this.rightButton = e.button === 2;
        this.buttons = e.buttons;
        this.target = e.target;
        this.detail = e.detail || 1;
        if (e.type === 'dblclick') {
            this.detail = 2;
        }
        this.ctrlKey = e.ctrlKey;
        this.shiftKey = e.shiftKey;
        this.altKey = e.altKey;
        this.metaKey = e.metaKey;
        if (typeof e.pageX === 'number') {
            this.posx = e.pageX;
            this.posy = e.pageY;
        }
        else {
            // Probably hit by MSGestureEvent
            this.posx = e.clientX + this.target.ownerDocument.body.scrollLeft + this.target.ownerDocument.documentElement.scrollLeft;
            this.posy = e.clientY + this.target.ownerDocument.body.scrollTop + this.target.ownerDocument.documentElement.scrollTop;
        }
        // Find the position of the iframe this code is executing in relative to the iframe where the event was captured.
        const iframeOffsets = IframeUtils.getPositionOfChildWindowRelativeToAncestorWindow(targetWindow, e.view);
        this.posx -= iframeOffsets.left;
        this.posy -= iframeOffsets.top;
    }
    preventDefault() {
        this.browserEvent.preventDefault();
    }
    stopPropagation() {
        this.browserEvent.stopPropagation();
    }
}
export class DragMouseEvent extends StandardMouseEvent {
    constructor(targetWindow, e) {
        super(targetWindow, e);
        this.dataTransfer = e.dataTransfer;
    }
}
export class StandardWheelEvent {
    constructor(e, deltaX = 0, deltaY = 0) {
        this.browserEvent = e || null;
        this.target = e ? (e.target || e.targetNode || e.srcElement) : null;
        this.deltaY = deltaY;
        this.deltaX = deltaX;
        let shouldFactorDPR = false;
        if (browser.isChrome) {
            // Chrome version >= 123 contains the fix to factor devicePixelRatio into the wheel event.
            // See https://chromium.googlesource.com/chromium/src.git/+/be51b448441ff0c9d1f17e0f25c4bf1ab3f11f61
            const chromeVersionMatch = navigator.userAgent.match(/Chrome\/(\d+)/);
            const chromeMajorVersion = chromeVersionMatch ? parseInt(chromeVersionMatch[1]) : 123;
            shouldFactorDPR = chromeMajorVersion <= 122;
        }
        if (e) {
            // Old (deprecated) wheel events
            const e1 = e;
            const e2 = e;
            const devicePixelRatio = e.view?.devicePixelRatio || 1;
            // vertical delta scroll
            if (typeof e1.wheelDeltaY !== 'undefined') {
                if (shouldFactorDPR) {
                    // Refs https://github.com/microsoft/vscode/issues/146403#issuecomment-1854538928
                    this.deltaY = e1.wheelDeltaY / (120 * devicePixelRatio);
                }
                else {
                    this.deltaY = e1.wheelDeltaY / 120;
                }
            }
            else if (typeof e2.VERTICAL_AXIS !== 'undefined' && e2.axis === e2.VERTICAL_AXIS) {
                this.deltaY = -e2.detail / 3;
            }
            else if (e.type === 'wheel') {
                // Modern wheel event
                // https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent
                const ev = e;
                if (ev.deltaMode === ev.DOM_DELTA_LINE) {
                    // the deltas are expressed in lines
                    if (browser.isFirefox && !platform.isMacintosh) {
                        this.deltaY = -e.deltaY / 3;
                    }
                    else {
                        this.deltaY = -e.deltaY;
                    }
                }
                else {
                    this.deltaY = -e.deltaY / 40;
                }
            }
            // horizontal delta scroll
            if (typeof e1.wheelDeltaX !== 'undefined') {
                if (browser.isSafari && platform.isWindows) {
                    this.deltaX = -(e1.wheelDeltaX / 120);
                }
                else if (shouldFactorDPR) {
                    // Refs https://github.com/microsoft/vscode/issues/146403#issuecomment-1854538928
                    this.deltaX = e1.wheelDeltaX / (120 * devicePixelRatio);
                }
                else {
                    this.deltaX = e1.wheelDeltaX / 120;
                }
            }
            else if (typeof e2.HORIZONTAL_AXIS !== 'undefined' && e2.axis === e2.HORIZONTAL_AXIS) {
                this.deltaX = -e.detail / 3;
            }
            else if (e.type === 'wheel') {
                // Modern wheel event
                // https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent
                const ev = e;
                if (ev.deltaMode === ev.DOM_DELTA_LINE) {
                    // the deltas are expressed in lines
                    if (browser.isFirefox && !platform.isMacintosh) {
                        this.deltaX = -e.deltaX / 3;
                    }
                    else {
                        this.deltaX = -e.deltaX;
                    }
                }
                else {
                    this.deltaX = -e.deltaX / 40;
                }
            }
            // Assume a vertical scroll if nothing else worked
            if (this.deltaY === 0 && this.deltaX === 0 && e.wheelDelta) {
                if (shouldFactorDPR) {
                    // Refs https://github.com/microsoft/vscode/issues/146403#issuecomment-1854538928
                    this.deltaY = e.wheelDelta / (120 * devicePixelRatio);
                }
                else {
                    this.deltaY = e.wheelDelta / 120;
                }
            }
        }
    }
    preventDefault() {
        this.browserEvent?.preventDefault();
    }
    stopPropagation() {
        this.browserEvent?.stopPropagation();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW91c2VFdmVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvbW91c2VFdmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssT0FBTyxNQUFNLGNBQWMsQ0FBQztBQUN4QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQzFDLE9BQU8sS0FBSyxRQUFRLE1BQU0sdUJBQXVCLENBQUM7QUFzQmxELE1BQU0sT0FBTyxrQkFBa0I7SUFrQjlCLFlBQVksWUFBb0IsRUFBRSxDQUFhO1FBQzlDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzVCLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDO1FBQ3RCLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQztRQUNuQyxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUV6QixJQUFJLENBQUMsTUFBTSxHQUFnQixDQUFDLENBQUMsTUFBTSxDQUFDO1FBRXBDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUM7UUFDNUIsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ2pCLENBQUM7UUFDRCxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxPQUFP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