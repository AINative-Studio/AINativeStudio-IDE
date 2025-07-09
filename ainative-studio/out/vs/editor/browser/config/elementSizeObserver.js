/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../base/common/lifecycle.js';
import { Emitter } from '../../../base/common/event.js';
import { getWindow, scheduleAtNextAnimationFrame } from '../../../base/browser/dom.js';
export class ElementSizeObserver extends Disposable {
    constructor(referenceDomElement, dimension) {
        super();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._referenceDomElement = referenceDomElement;
        this._width = -1;
        this._height = -1;
        this._resizeObserver = null;
        this.measureReferenceDomElement(false, dimension);
    }
    dispose() {
        this.stopObserving();
        super.dispose();
    }
    getWidth() {
        return this._width;
    }
    getHeight() {
        return this._height;
    }
    startObserving() {
        if (!this._resizeObserver && this._referenceDomElement) {
            // We want to react to the resize observer only once per animation frame
            // The first time the resize observer fires, we will react to it immediately.
            // Otherwise we will postpone to the next animation frame.
            // We'll use `observeContentRect` to store the content rect we received.
            let observedDimenstion = null;
            const observeNow = () => {
                if (observedDimenstion) {
                    this.observe({ width: observedDimenstion.width, height: observedDimenstion.height });
                }
                else {
                    this.observe();
                }
            };
            let shouldObserve = false;
            let alreadyObservedThisAnimationFrame = false;
            const update = () => {
                if (shouldObserve && !alreadyObservedThisAnimationFrame) {
                    try {
                        shouldObserve = false;
                        alreadyObservedThisAnimationFrame = true;
                        observeNow();
                    }
                    finally {
                        scheduleAtNextAnimationFrame(getWindow(this._referenceDomElement), () => {
                            alreadyObservedThisAnimationFrame = false;
                            update();
                        });
                    }
                }
            };
            this._resizeObserver = new ResizeObserver((entries) => {
                if (entries && entries[0] && entries[0].contentRect) {
                    observedDimenstion = { width: entries[0].contentRect.width, height: entries[0].contentRect.height };
                }
                else {
                    observedDimenstion = null;
                }
                shouldObserve = true;
                update();
            });
            this._resizeObserver.observe(this._referenceDomElement);
        }
    }
    stopObserving() {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
    }
    observe(dimension) {
        this.measureReferenceDomElement(true, dimension);
    }
    measureReferenceDomElement(emitEvent, dimension) {
        let observedWidth = 0;
        let observedHeight = 0;
        if (dimension) {
            observedWidth = dimension.width;
            observedHeight = dimension.height;
        }
        else if (this._referenceDomElement) {
            observedWidth = this._referenceDomElement.clientWidth;
            observedHeight = this._referenceDomElement.clientHeight;
        }
        observedWidth = Math.max(5, observedWidth);
        observedHeight = Math.max(5, observedHeight);
        if (this._width !== observedWidth || this._height !== observedHeight) {
            this._width = observedWidth;
            this._height = observedHeight;
            if (emitEvent) {
                this._onDidChange.fire();
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxlbWVudFNpemVPYnNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9jb25maWcvZWxlbWVudFNpemVPYnNlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFL0QsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUV2RixNQUFNLE9BQU8sbUJBQW9CLFNBQVEsVUFBVTtJQVVsRCxZQUFZLG1CQUF1QyxFQUFFLFNBQWlDO1FBQ3JGLEtBQUssRUFBRSxDQUFDO1FBVEQsaUJBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUMzQyxnQkFBVyxHQUFnQixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQztRQVNsRSxJQUFJLENBQUMsb0JBQW9CLEdBQUcsbUJBQW1CLENBQUM7UUFDaEQsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNqQixJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ2xCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO1FBQzVCLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVlLE9BQU87UUFDdEIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3JCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDO0lBRU0sUUFBUTtRQUNkLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNwQixDQUFDO0lBRU0sU0FBUztRQUNmLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztJQUNyQixDQUFDO0lBRU0sY0FBYztRQUNwQixJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsSUFBSSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUN4RCx3RUFBd0U7WUFDeEUsNkVBQTZFO1lBQzdFLDBEQUEwRDtZQUMxRCx3RUFBd0U7WUFFeEUsSUFBSSxrQkFBa0IsR0FBc0IsSUFBSSxDQUFDO1lBQ2pELE1BQU0sVUFBVSxHQUFHLEdBQUcsRUFBRTtnQkFDdkIsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO29CQUN4QixJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsa0JBQWtCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztnQkFDdEYsQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDaEIsQ0FBQztZQUNGLENBQUMsQ0FBQztZQUVGLElBQUksYUFBYSxHQUFHLEtBQUssQ0FBQztZQUMxQixJQUFJLGlDQUFpQyxHQUFHLEtBQUssQ0FBQztZQUU5QyxNQUFNLE1BQU0sR0FBRyxHQUFHLEVBQUU7Z0JBQ25CLElBQUksYUFBYSxJQUFJLENBQUMsaUNBQWlDLEVBQUUsQ0FBQztvQkFDekQsSUFBSSxDQUFDO3dCQUNKLGFBQWEsR0FBRyxLQUFLLENBQUM7d0JBQ3RCLGlDQUFpQyxHQUFHLElBQUksQ0FBQzt3QkFDekMsVUFBVSxFQUFFLENBQUM7b0JBQ2QsQ0FBQzs0QkFBUyxDQUFDO3dCQUNWLDRCQUE0QixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsRUFBRSxHQUFHLEVBQUU7NEJBQ3ZFLGlDQUFpQyxHQUFHLEtBQUssQ0FBQzs0QkFDMUMsTUFBTSxFQUFFLENBQUM7d0JBQ1YsQ0FBQyxDQUFDLENBQUM7b0JBQ0osQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQyxDQUFDO1lBRUYsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO2dCQUNyRCxJQUFJLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUNyRCxrQkFBa0IsR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDckcsQ0FBQztxQkFBTSxDQUFDO29CQUNQLGtCQUFrQixHQUFHLElBQUksQ0FBQztnQkFDM0IsQ0FBQztnQkFDRCxhQUFhLEdBQUcsSUFBSSxDQUFDO2dCQUNyQixNQUFNLEVBQUUsQ0FBQztZQUNWLENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDekQsQ0FBQztJQUNGLENBQUM7SUFFTSxhQUFhO1FBQ25CLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxlQUFlLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDbEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7UUFDN0IsQ0FBQztJQUNGLENBQUM7SUFFTSxPQUFPLENBQUMsU0FBc0I7UUFDcEMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBRU8sMEJBQTBCLENBQUMsU0FBa0IsRUFBRSxTQUFzQjtRQUM1RSxJQUFJLGFBQWEsR0FBRyxDQUFDLENBQUM7UUFDdEIsSUFBSSxjQUFjLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixhQUFhLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQztZQUNoQyxjQUFjLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQztRQUNuQyxDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUN0QyxhQUFhLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQztZQUN0RCxjQUFjLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFlBQVksQ0FBQztRQUN6RCxDQUFDO1FBQ0QsYUFBYSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQzNDLGNBQWMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUM3QyxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssYUFBYSxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssY0FBYyxFQUFFLENBQUM7WUFDdEUsSUFBSSxDQUFDLE1BQU0sR0FBRyxhQUFhLENBQUM7WUFDNUIsSUFBSSxDQUFDLE9BQU8sR0FBRyxjQUFjLENBQUM7WUFDOUIsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzFCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=